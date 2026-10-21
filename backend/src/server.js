/**
 * server.js — entrada do backend.
 *
 * Roda HTTP em desenvolvimento; HTTPS se TLS_KEY/TLS_CERT forem definidas.
 * Na produção recomenda-se proxy reverso (nginx/caddy) com TLS, ou definir
 * as variáveis TLS.
 */
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import 'dotenv/config';

import { seedAdminFromEnv } from './db.js';
import { createApp } from './app.js';

seedAdminFromEnv();

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const app = createApp();

let server;
if (process.env.TLS_KEY && process.env.TLS_CERT) {
  server = https.createServer(
    {
      key: fs.readFileSync(process.env.TLS_KEY),
      cert: fs.readFileSync(process.env.TLS_CERT),
    },
    app
  );
  console.log('[server] HTTPS ativado.');
} else {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[server] ATENÇÃO: rodando sem TLS. Use reverse proxy nginx/caddy ou defina TLS_KEY/TLS_CERT.');
  }
  server = http.createServer(app);
}

server.listen(PORT, HOST, () => {
  console.log(`[server] Central de Campo API em ${process.env.TLS_KEY ? 'https' : 'http'}://${HOST}:${PORT}`);
  console.log(`[server] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
});
