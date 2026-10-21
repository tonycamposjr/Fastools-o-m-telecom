/**
 * app.js — aplicação Express: headers de segurança, Cookies, CSRF, rotas.
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createAuthRouter, SESSION_COOKIE } from './auth.js';
import { createOtdrRouter } from './otdr.js';
import { createFilesRouter } from './files.js';
import { createAdminRouter } from './admin.js';
import { requireAuth } from './guards.js';
import { ensureCsrfToken, requireCsrf } from './csrf.js';
import { db, getUserByUsername, logActivity, cleanExpiredSessions } from './db.js';
import { randomId, safeEqualStr } from './util.js';

const SECURE_COOKIES = process.env.NODE_ENV === 'production';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // atrás de nginx/caddy na produção

  app.use((req, res, next) => {
    res.locals.secureCookies = SECURE_COOKIES;
    // Cabeçalhos mínimos de segurança (OWASP)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
    if (SECURE_COOKIES) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.use(express.json({ limit: '16mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  /* CSRF: token garantido em toda rota e conferido nas escritas */
  app.use(ensureCsrfToken, requireCsrf);

  /* limpa sessões expiradas ocasionalmente */
  let lastSweep = 0;
  app.use((_req, _res, next) => {
    const t = Date.now();
    if (t - lastSweep > 30 * 60 * 1000) {
      lastSweep = t;
      try {
        cleanExpiredSessions();
      } catch (e) {}
    }
    next();
  });

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */
  const api = express.Router();

  api.use('/auth', createAuthRouter());
  api.get('/me', requireAuth, (req, res) => res.json(req.user));
  api.use('/otdr', requireAuth, createOtdrRouter());
  api.use('/files', requireAuth, createFilesRouter());
  api.use('/admin', createAdminRouter()); // já protege internamente

  app.use('/api', api);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

  /* Tratador de erros global (sem leaks de stack) */
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Payload grande demais.' });
    }
    console.error('[erro]', err?.message || err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  /* ------------------------------------------------------------------ */
  /* Front-end (build do Vite em produção)                               */
  /* ------------------------------------------------------------------ */
  const distDir = process.env.SERVE_DIST || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir, { index: false, maxAge: '1d' }));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}
