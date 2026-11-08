'use strict';

/* Smoke test do Electron: abre a janela, captura um screenshot e encerra.
   Uso:
     node test/smoke.js
     node test/smoke.js --exe "release/Magic Local 1.0.0.exe"

   O binario empacotado aceita as mesmas variaveis de ambiente. */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.join(__dirname, '..');
const artifacts = path.join(__dirname, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });

const shotPath = path.join(artifacts, 'smoke.png');
const shotsDir = path.join(artifacts, 'shots');
const resultPath = path.join(artifacts, 'smoke-status.txt');
const logPath = path.join(artifacts, 'smoke-result.txt');

if (fs.existsSync(shotsDir)) fs.rmSync(shotsDir, { recursive: true, force: true });
fs.mkdirSync(shotsDir, { recursive: true });
if (fs.existsSync(resultPath)) fs.unlinkSync(resultPath);

const exeIndex = process.argv.indexOf('--exe');
const packagedExe = exeIndex >= 0 ? process.argv[exeIndex + 1] : '';

function resolveLaunch() {
  if (packagedExe) {
    const resolved = path.resolve(root, packagedExe);
    if (!fs.existsSync(resolved)) throw new Error(`Executavel nao encontrado: ${resolved}`);
    return { command: resolved, args: [] };
  }
  const electron = require('electron');
  return { command: electron, args: ['.'] };
}

function run() {
  let launch;
  try {
    launch = resolveLaunch();
  } catch (error) {
    console.error(String(error.message || error));
    process.exit(1);
    return;
  }

  if (fs.existsSync(shotPath)) fs.unlinkSync(shotPath);

  const started = Date.now();
  const child = spawn(launch.command, launch.args, {
    cwd: root,
    env: {
      ...process.env,
      MAGIC_SMOKE: '1',
      MAGIC_SMOKE_SHOT: shotPath,
      MAGIC_SMOKE_DIR: shotsDir,
      MAGIC_SMOKE_RESULT: resultPath,
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false,
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf8');
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });

  const timer = setTimeout(() => {
    console.error('Smoke test excedeu 60 s. Encerrando...');
    child.kill();
  }, 60000);

  child.on('error', (error) => {
    clearTimeout(timer);
    console.error(`Falha ao iniciar: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    clearTimeout(timer);
    const elapsed = Date.now() - started;
    const hasMarker = stdout.includes('SMOKE magic-local ui ok');
    const resultText = fs.existsSync(resultPath) ? fs.readFileSync(resultPath, 'utf8').trim() : '';
    const statusOk = resultText === 'ok';
    const shotOk = fs.existsSync(shotPath) && fs.statSync(shotPath).size > 15000;
    const shotSize = shotOk ? fs.statSync(shotPath).size : 0;

    const views = ['dashboard', 'hgu', 'terminal', 'network', 'report'];
    const viewShots = views.map((view) => {
      const file = path.join(shotsDir, `${view}.png`);
      const ok = fs.existsSync(file) && fs.statSync(file).size > 15000;
      return { view, file, ok, size: ok ? fs.statSync(file).size : 0 };
    });
    const viewsOk = viewShots.every((item) => item.ok);
    const rendererErrors = stderr
      .split(/\r?\n/)
      .filter((line) => line.includes('RENDERER ERROR') || line.includes('RENDERER GONE'));

    const lines = [
      'MAGIC LOCAL - SMOKE TEST',
      `Data: ${new Date().toISOString()}`,
      `Alvo: ${launch.command} ${launch.args.join(' ')}`.trim(),
      `Codigo de saida: ${code}`,
      `Duracao: ${elapsed} ms`,
      `Marcador de UI: ${hasMarker || statusOk ? 'ok' : `ausente (${resultText || 'sem arquivo'})`}`,
      `Screenshot: ${shotOk ? `${shotPath} (${shotSize} bytes)` : 'ausente/pequeno'}`,
      `Abas: ${viewShots.map((item) => `${item.view}=${item.ok ? item.size : 'falhou'}`).join(', ')}`,
      `Erros de renderer: ${rendererErrors.length ? rendererErrors.join(' | ') : 'nenhum'}`,
      '',
      '--- stdout ---',
      stdout.trim(),
      '',
      '--- stderr ---',
      stderr.trim(),
      '',
    ];
    fs.writeFileSync(logPath, lines.join('\r\n'), 'utf8');

    if (code === 0 && (hasMarker || statusOk) && shotOk && viewsOk && !rendererErrors.length) {
      console.log(`SMOKE ok (${elapsed} ms) - screenshot ${shotSize} bytes, ${views.length} abas`);
      console.log(`Log: ${logPath}`);
      process.exit(0);
      return;
    }

    console.error('SMOKE falhou.');
    console.error(lines.join('\n'));
    process.exit(1);
  });
}

run();
