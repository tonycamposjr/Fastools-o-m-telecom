/**
 * auth.js — cadastro, login, logout e sessão.
 *
 * - Senhas só como hash bcrypt (custo 12), nunca texto puro.
 * - Bloqueio temporário contra força bruta: 5 falhas em 15 min por usuário+IP.
 * - Sessão por cookie HttpOnly + SameSite=Lax (+ Secure em produção).
 * - Erros genéricos de login (sem enumeração de usuários).
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, getUserByUsername, createUser, setSession, deleteSession, logActivity, now } from './db.js';
import { isValidUsername, isValidPassword, randomToken, clientIp, isEmailish } from './util.js';

export const SESSION_COOKIE = 'cc_session';

export function createAuthRouter() {
  const router = Router();

  /** Rate-limit simples por IP para /login e /register: 30 req / 5 min. */
  const hits = new Map(); // ip -> {count, windowStart}
  const limitAuth = (req, res, next) => {
    const ip = clientIp(req);
    const nowMs = Date.now();
    let rec = hits.get(ip);
    if (!rec || nowMs - rec.windowStart > 5 * 60 * 1000) {
      rec = { count: 0, windowStart: nowMs };
      hits.set(ip, rec);
    }
    rec.count += 1;
    if (rec.count > 30) {
      return res.status(429).json({ error: 'Muitas requisições. Tente novamente mais tarde.' });
    }
    next();
  };

  /** Bloqueio de força bruta (tabela login_attempts). */
  function checkLockout(username, ip) {
    const row = db
      .prepare('SELECT fails, window_started_at FROM login_attempts WHERE username = ? AND ip = ?')
      .get(username, ip);
    if (!row) return null;
    if (Date.now() - row.window_started_at > 15 * 60 * 1000) {
      db.prepare('DELETE FROM login_attempts WHERE username = ? AND ip = ?').run(username, ip);
      return null;
    }
    if (row.fails >= 5) {
      const secondsRemaining = Math.ceil((row.window_started_at + 15 * 60 * 1000 - Date.now()) / 1000);
      return { locked: true, secondsRemaining };
    }
    return null;
  }

  function recordFailure(username, ip) {
    const existing = db
      .prepare('SELECT fails, window_started_at FROM login_attempts WHERE username = ? AND ip = ?')
      .get(username, ip);
    const nowMs = Date.now();
    if (existing && nowMs - existing.window_started_at <= 15 * 60 * 1000) {
      db.prepare('UPDATE login_attempts SET fails = fails + 1 WHERE username = ? AND ip = ?').run(username, ip);
    } else {
      db.prepare(
        'INSERT OR REPLACE INTO login_attempts (username, ip, fails, window_started_at) VALUES (?, ?, 1, ?)'
      ).run(username, ip, nowMs);
    }
  }

  function setSessionCookie(res, token, maxAgeMs) {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: res.locals.secureCookies === true,
      maxAge: maxAgeMs,
      path: '/',
    });
  }

  function loginResponse(res, user, maxAgeMs) {
    const token = randomToken();
    setSession(token, user.id);
    setSessionCookie(res, token, maxAgeMs);
    return { id: user.id, username: user.username, name: user.name, role: user.role };
  }

  router.post('/register', limitAuth, async (req, res) => {
    const body = req.body || {};
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = body.password;
    const name = body.name;

    if (!isValidUsername(username)) {
      return res.status(400).json({
        error: 'Nome de usuário inválido: use 3–32 caracteres (letras, números, . _ -) começando por letra ou número.',
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres.' });
    }
    if (name !== undefined && name !== null && name !== '' && !isEmailish(name)) {
      return res.status(400).json({ error: 'Nome inválido.' });
    }

    const ip = clientIp(req);
    const lock = checkLockout(username, ip);
    if (lock) return res.status(429).json({ error: 'Muitas tentativas. Aguarde antes de tentar novamente.' });

    try {
      const user = await createUser({
        username,
        password,
        name: name ? String(name).trim().slice(0, 200) : null,
        role: 'user', // never allow self-promotion
      });
      const me = loginResponse(res, user, 7 * 24 * 3600 * 1000);
      logActivity({ userId: user.id, username: user.username, action: 'auth.register', ip });
      res.status(201).json(me);
    } catch (e) {
      if (e && /UNIQUE constraint/i.test(String(e.message))) {
        recordFailure(username, ip); // also avoid registr brute force spam
        return res.status(409).json({ error: 'Nome de usuário já está em uso.' });
      }
      console.error('[auth] falha no registro:', e.message);
      return res.status(500).json({ error: 'Erro interno ao criar conta.' });
    }
  });

  router.post('/login', limitAuth, (req, res) => {
    const body = req.body || {};
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const ip = clientIp(req);

    if (!username || !password) {
      return res.status(400).json({ error: 'Informe usuário e senha.' });
    }

    const lock = checkLockout(username, ip);
    if (lock) {
      return res
        .status(429)
        .json({ error: `Conta temporariamente bloqueada por tentativas excessivas. Tente em ${lock.secondsRemaining}s.` });
    }

    const user = getUserByUsername(username);
    const ok = user ? bcrypt.compareSync(password, user.password_hash) : false;
    if (!ok || !user.active) {
      recordFailure(username, ip);
      logActivity({ username, action: 'auth.login.fail', ip });
      // mensagem idêntica para usuário inexistente, senha errada ou conta desativada
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    db.prepare('DELETE FROM login_attempts WHERE username = ? AND ip = ?').run(username, ip);
    const me = loginResponse(res, user, 7 * 24 * 3600 * 1000);
    logActivity({ userId: user.id, username: user.username, action: 'auth.login', ip });
    res.json(me);
  });

  router.post('/logout', (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) deleteSession(token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  return router;
}
