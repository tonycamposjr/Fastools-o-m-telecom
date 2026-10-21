/**
 * guards.js — middlewares de sessão e controle de papel (role).
 *
 * A sessão é resolvida no servidor a cada requisição (cookie HttpOnly →
 * tabela sessions → tabela users). Contas desativadas são rejeitadas mesmo
 * com cookie válido. O papel "admin" é verificado SEMPRE no backend.
 */
import { db, now } from './db.js';
import { SESSION_COOKIE } from './auth.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }
  const row = db
    .prepare(
      `SELECT s.expires_at, u.id, u.username, u.name, u.role, u.active
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`
    )
    .get(token);
  if (!row || row.expires_at < now()) {
    if (row) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return res.status(401).json({ error: 'Sessão expirada ou inválida.' });
  }
  if (!row.active) {
    return res.status(403).json({ error: 'Conta desativada. Contate o administrador.' });
  }
  req.user = { id: row.id, username: row.username, name: row.name, role: row.role };
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  }
  next();
}
