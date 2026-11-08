'use strict';

/* Magic Local - app desktop sem login.
 *
 * Tudo roda na máquina do técnico:
 *  - diagnóstico da rede local (ping, portas, varredura ARP)
 *  - conexão SSH direta no HGU (usuário support + senha informada)
 *  - inventário, comandos e laudo
 *
 * Não existe backend, telemetria nem chamada aos servidores da Vivo.
 */

const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');

const { getOverview, pingHost, checkPorts, scanLan } = require('./lib/network');
const { HguSession, PROFILES } = require('./lib/hgu');
const { parseInventory, textReport } = require('./lib/parser');

const session = new HguSession();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1420,
    height: 940,
    minWidth: 1080,
    minHeight: 680,
    show: true,
    backgroundColor: '#0c0d10',
    autoHideMenuBar: true,
    title: 'Magic Local - Diagnóstico de Campo',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.control && input.key.toLowerCase() === 'r') {
      win.webContents.reload();
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  win.on('closed', () => {
    session.disconnect().catch(() => {});
    win = null;
  });

  win.webContents.on('console-message', (_event, level, message) => {
    if (level >= 3) console.error('RENDERER ERROR:', message);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('RENDERER GONE:', details.reason);
  });

  if (process.env.MAGIC_SMOKE === '1') {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        try {
          const shotPath = process.env.MAGIC_SMOKE_SHOT;
          if (shotPath) {
            const image = await win.webContents.capturePage();
            fs.writeFileSync(shotPath, image.toPNG());
          }

          const shotDir = process.env.MAGIC_SMOKE_DIR;
          if (shotDir) {
            fs.mkdirSync(shotDir, { recursive: true });
            for (const view of ['dashboard', 'hgu', 'terminal', 'network', 'report']) {
              await win.webContents.executeJavaScript(
                `(() => { const tab = document.querySelector('[data-view="${view}"]'); if (tab) tab.click(); return Boolean(tab); })()`,
              );
              await sleep(400);
              const image = await win.webContents.capturePage();
              fs.writeFileSync(path.join(shotDir, `${view}.png`), image.toPNG());
            }
          }

          console.log('SMOKE magic-local ui ok');
          if (process.env.MAGIC_SMOKE_RESULT) {
            fs.writeFileSync(process.env.MAGIC_SMOKE_RESULT, 'ok', 'utf8');
          }
        } catch (error) {
          console.error('SMOKE UI ERROR', error);
          if (process.env.MAGIC_SMOKE_RESULT) {
            fs.writeFileSync(process.env.MAGIC_SMOKE_RESULT, `error: ${error && error.message ? error.message : error}`, 'utf8');
          }
        }
        app.quit();
      }, 1800);
    });
  }
}

/* ------------------------------ Rede local ------------------------------ */

ipcMain.handle('net:overview', async () => {
  try {
    return { ok: true, data: await getOverview() };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
});

ipcMain.handle('net:ping', async (_event, payload) => {
  try {
    const host = String(payload && payload.host ? payload.host : '').trim();
    if (!host) throw new Error('Informe um host ou IP.');
    const count = Math.max(1, Math.min(10, Number(payload.count) || 4));
    const timeout = Math.max(200, Math.min(5000, Number(payload.timeout) || 1200));
    return { ok: true, data: await pingHost(host, count, timeout) };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
});

ipcMain.handle('net:ports', async (_event, payload) => {
  try {
    const host = String(payload && payload.host ? payload.host : '').trim();
    if (!host) throw new Error('Informe um host ou IP.');
    const ports = Array.isArray(payload.ports) && payload.ports.length
      ? payload.ports
      : [22, 80, 443, 7547];
    return { ok: true, data: await checkPorts(host, ports) };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
});

ipcMain.handle('net:scan', async (event, payload) => {
  try {
    const send = (progress) => {
      if (!event.sender.isDestroyed()) event.sender.send('net:scan:progress', progress);
    };
    const data = await scanLan(send, payload && payload.range);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
});

/* ---------------------------------- SSH --------------------------------- */

ipcMain.handle('ssh:connect', async (_event, payload) => {
  try {
    const host = String(payload && payload.host ? payload.host : '').trim();
    const username = String(payload && payload.username ? payload.username : 'support').trim() || 'support';
    const password = String(payload && payload.password ? payload.password : '');
    const port = Math.max(1, Math.min(65535, Number(payload && payload.port) || 22));
    if (!host) throw new Error('Informe o IP do HGU.');
    if (!password) throw new Error('Informe a senha SSH do HGU.');

    const result = await session.connect({ host, port, username, password });
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
});

ipcMain.handle('ssh:disconnect', async () => {
  await session.disconnect();
  return { ok: true };
});

ipcMain.handle('ssh:status', async () => ({ ok: true, data: session.status() }));

ipcMain.handle('ssh:exec', async (_event, payload) => {
  try {
    const command = String(payload && payload.command ? payload.command : '').trim();
    if (!command) throw new Error('Digite um comando.');
    if (!session.connected) throw new Error('Conecte ao HGU primeiro.');
    const data = await session.exec(command, {
      timeout: Math.max(3000, Math.min(60000, Number(payload.timeout) || 15000)),
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
});

ipcMain.handle('ssh:inventory', async (event, payload) => {
  try {
    if (!session.connected) throw new Error('Conecte ao HGU primeiro.');
    const send = (progress) => {
      if (!event.sender.isDestroyed()) event.sender.send('ssh:inventory:progress', progress);
    };
    const inventory = await session.inventory(send, {
      includeWifi: payload ? payload.includeWifi !== false : true,
    });
    inventory.summary = parseInventory(inventory);
    return { ok: true, data: inventory };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
});

ipcMain.handle('ssh:profiles', async () => ({ ok: true, data: PROFILES }));

/* -------------------------------- Laudo --------------------------------- */

function safeFileName(value) {
  return String(value || 'laudo')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'laudo';
}

ipcMain.handle('report:save', async (_event, payload) => {
  try {
    const report = payload && payload.report ? payload.report : {};
    const format = payload && payload.format === 'txt' ? 'txt' : 'json';
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const suggested = `${safeFileName(report.title || 'magic-local')}-${stamp}.${format}`;

    const answer = await dialog.showSaveDialog(win, {
      title: 'Salvar laudo',
      defaultPath: path.join(app.getPath('documents'), suggested),
      filters: format === 'json'
        ? [{ name: 'JSON', extensions: ['json'] }]
        : [{ name: 'Texto', extensions: ['txt'] }],
    });

    if (answer.canceled || !answer.filePath) return { ok: true, canceled: true };

    const content = format === 'json'
      ? JSON.stringify(report, null, 2)
      : String(payload.text || textReport(report));

    fs.writeFileSync(answer.filePath, content, 'utf8');
    return { ok: true, filePath: answer.filePath };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
});

ipcMain.handle('app:info', async () => ({
  ok: true,
  data: {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  },
}));

/* ------------------------------- Bootstrap ------------------------------ */

app.setAppUserModelId('com.tonycamposjr.magiclocal');

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  session.disconnect().catch(() => {});
});
