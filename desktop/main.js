'use strict';

/* Fastools Desktop — janela unica com o Fastools e o SIGITM embutido.
 *
 * O SIGITM envia `X-Frame-Options: SAMEORIGIN` + Cloudflare, entao nao pode
 * ser exibido em iframe no site. Aqui ele roda em uma WebContentsView NATIVA
 * (navegacao de nivel superior), onde o bloqueio de iframe nao se aplica:
 * o usuario ve o SIGITM dentro da mesma janela do Fastools, sem navegador externo.
 *
 * O renderer (React) avisa via IPC onde a view deve ficar (por conta do
 * cabecalho/rodape do Fastools que continuam visiveis e clicaveis).
 */

const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { URL } = require('node:url');
const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell } = require('electron');

const SIGITM_URL = 'https://sigitm.vivo.com.br/app/app.jsp';
const DIST_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'dist')
  : path.join(__dirname, '..', 'dist');

/* Porta fixa: a origem (http://127.0.0.1:43110) precisa ser estavel entre
   execucoes, senao o localStorage do Fastools (dados das ferramentas, tema,
   login) seria descartado a cada abertura. Fallback so se a porta estiver ocupada. */
const PREFERRED_PORT = 43110;
const PORT_ATTEMPTS = 10;

let win = null;
let sigitmView = null;
let staticServer = null;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.map': 'application/json; charset=utf-8',
};

/**
 * Serve o build do Fastools em 127.0.0.1 (porta fixa).
 * Necessario porque ES modules nao carregam via file:// (CORS), e Firebase/auth
 * se comportam como no site quando a origem e http.
 */
function startStaticServer(root, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, 'http://127.0.0.1');
        let pathname = decodeURIComponent(url.pathname);
        if (pathname === '/') pathname = '/index.html';

        const file = path.normalize(path.join(root, pathname));
        if (!file.startsWith(path.normalize(root + path.sep))) {
          res.writeHead(403).end('Forbidden');
          return;
        }

        fs.readFile(file, (err, buffer) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
            return;
          }
          res.writeHead(200, {
            'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-cache',
          });
          res.end(buffer);
        });
      } catch {
        res.writeHead(400).end('Bad request');
      }
    });

    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function startServerWithFallback(root) {
  for (let i = 0; i < PORT_ATTEMPTS; i += 1) {
    try {
      return await startStaticServer(root, PREFERRED_PORT + i);
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error(`Portas ${PREFERRED_PORT}-${PREFERRED_PORT + PORT_ATTEMPTS - 1} estao ocupadas.`);
}

function clampRect(rect) {
  const [winWidth, winHeight] = win.getContentSize();
  const x = Math.max(0, Math.min(Math.round(rect.x || 0), Math.max(0, winWidth - 1)));
  const y = Math.max(0, Math.min(Math.round(rect.y || 0), Math.max(0, winHeight - 1)));
  const width = Math.max(60, Math.min(Math.round(rect.width || winWidth), winWidth - x));
  const height = Math.max(60, Math.min(Math.round(rect.height || winHeight), winHeight - y));
  return { x, y, width, height };
}

function ensureSigitmView() {
  if (sigitmView && !sigitmView.webContents.isDestroyed()) return sigitmView;

  sigitmView = new WebContentsView({
    webPreferences: {
      partition: 'persist:sigitm', // mantem login/SSO entre execucoes do app
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.contentView.addChildView(sigitmView);
  sigitmView.setVisible(false);

  const wc = sigitmView.webContents;

  // UA sem o token Electron (evita challenge anti-bot desnecessario)
  try {
    wc.setUserAgent(wc.getUserAgent().replace(/\sElectron\/[\d.]+/i, '').replace(/\sFastools[^\s]*\/[\d.]+/i, ''));
  } catch { /* opcional */ }

  // Popups do SIGITM (relatorios etc.) abrem na propria view, nunca no navegador
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) wc.loadURL(url).catch(() => {});
    return { action: 'deny' };
  });

  wc.on('will-navigate', (event, url) => {
    if (!/^https?:/i.test(url)) event.preventDefault();
  });

  wc.loadURL(SIGITM_URL).catch(() => {
    /* sem rede no primeiro boot: a view mostra o erro e o usuario pode recarregar */
  });

  return sigitmView;
}

function showSigitm(rect) {
  const view = ensureSigitmView();
  view.setBounds(clampRect(rect));
  view.setVisible(true);
  view.webContents.focus();
}

function destroySigitm() {
  if (sigitmView && !sigitmView.webContents.isDestroyed()) {
    sigitmView.setVisible(false);
  }
}

function createWindow(appUrl) {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 640,
    show: process.env.FASTOOLS_SMOKE !== '1',
    backgroundColor: '#1d1d1d',
    autoHideMenuBar: true,
    title: 'Fastools — Central de Campo (Rede & OTDR)',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL(appUrl);

  // F12 abre devtools; Ctrl+R recarrega o Fastools
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

  // Links externos abertos pelo Fastools vao para o navegador padrao
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  win.on('closed', () => {
    destroySigitm();
    sigitmView = null;
    win = null;
  });
}

/* ------------------------- IPC da view do SIGITM ------------------------- */

ipcMain.on('sigitm:open', (_event, rect) => {
  if (!win) return;
  showSigitm(rect || {});
});

ipcMain.on('sigitm:bounds', (_event, rect) => {
  if (!win || !sigitmView || !rect) return;
  try {
    sigitmView.setBounds(clampRect(rect));
  } catch { /* view destruida durante o resize */ }
});

ipcMain.on('sigitm:close', () => {
  destroySigitm();
});

/* ------------------------------- Bootstrap ------------------------------ */

app.setAppUserModelId('com.tonycamposjr.fastools');

app.whenReady().then(async () => {
  try {
    if (process.env.FASTOOLS_URL) {
      createWindow(process.env.FASTOOLS_URL); // dev: vite em http://localhost:3000
      return;
    }

    if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
      dialog.showErrorBox(
        'Build do Fastools nao encontrado',
        'Rode "npm run build:desktop" na raiz do projeto (ou use "npm start" dentro de desktop/) e abra de novo.'
      );
      app.quit();
      return;
    }

    const { server, port } = await startServerWithFallback(DIST_DIR);
    staticServer = server;
    createWindow(`http://127.0.0.1:${port}/`);

    /* Smoke test (CI/terminal): FASTOOLS_SMOKE=1 valida o carregamento do
       Fastools e da view nativa do SIGITM, imprime o resultado e encerra. */
    if (process.env.FASTOOLS_SMOKE === '1') {
      win.webContents.once('did-finish-load', () => {
        console.log('SMOKE fastools ok');
        showSigitm({ x: 40, y: 120, width: 900, height: 600 });
        const wc = sigitmView.webContents;
        const done = (message) => {
          console.log(message);
          setTimeout(() => app.quit(), 300);
        };
        wc.once('did-finish-load', () => done(`SMOKE sigitm ok: ${wc.getURL()}`));
        wc.once('did-fail-load', (_event, code, desc) => done(`SMOKE sigitm fail ${code} ${desc}`));
        setTimeout(() => done('SMOKE sigitm timeout'), 20000);
      });
      win.webContents.once('did-fail-load', (_event, code, desc) => {
        console.log(`SMOKE fastools fail ${code} ${desc}`);
        app.quit();
      });
    }
  } catch (error) {
    dialog.showErrorBox('Falha ao iniciar o Fastools Desktop', String(error));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length > 0) return;
  if (process.env.FASTOOLS_URL) {
    createWindow(process.env.FASTOOLS_URL);
    return;
  }
  const { server, port } = await startServerWithFallback(DIST_DIR);
  staticServer = server;
  createWindow(`http://127.0.0.1:${port}/`);
});
