/**
 * db.js — Banco de dados SQLite (node:sqlite embutido no Node.js)
 *
 * Todas as tabelas de dados de usuário carregam `user_id` e todas as consultas
 * do servidor filtram SEMPRE por user_id (isolamento de dados). Nunca confie
 * em IDs vindos do cliente como dono do recurso.
 */
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_DIR = path.resolve(BACKEND_ROOT, '..', '..');

export const DB_PATH = process.env.DB_PATH || path.join(BACKEND_ROOT, 'data', 'app.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

console.log('[db] usando', DB_PATH);

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  username          TEXT NOT NULL,
  ip                TEXT NOT NULL,
  fails             INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL,
  PRIMARY KEY (username, ip)
);

CREATE TABLE IF NOT EXISTS otdr_settings (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS otdr_traces (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_traces_user ON otdr_traces(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS files (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_path   TEXT NOT NULL,
  size          INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);

CREATE TABLE IF NOT EXISTS activity_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  username   TEXT,
  action     TEXT NOT NULL,
  detail     TEXT,
  ip         TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_log_time ON activity_log(created_at DESC);
`);

/** Utilidades de usuário -------------------------------------------------- */

export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(String(username));
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(String(id));
}

export async function createUser({ username, password, name = null, role = 'user' }) {
  const hash = await bcrypt.hash(password, 12);
  const id = 'u_' + crypto.randomUUID().replace(/-/g, '');
  db.prepare(
    'INSERT INTO users (id, username, name, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  ).run(id, username, name, hash, role, now());
  return getUserById(id);
}

export function setSession(token, userId) {
  const ttl = (Number(process.env.SESSION_TTL_HOURS) || 168) * 3600 * 1000;
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token, userId, now(), now() + ttl
  );
}

export function deleteSession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function cleanExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());
}

/** Seed do administrador via variáveis de ambiente (nunca no código) -------- */
export function seedAdminFromEnv() {
  const login = process.env.ADMIN_LOGIN;
  const password = process.env.ADMIN_PASSWORD;
  if (!login || !password) {
    console.warn(
      '[admin] ADMIN_LOGIN/ADMIN_PASSWORD não configurados — painel administrativo ficará sem admin até criar via variáveis.'
    );
    return null;
  }
  if (password.length < 8) {
    console.error('[admin] ADMIN_PASSWORD deve ter ao menos 8 caracteres. Seed cancelado.');
    return null;
  }
  const existing = getUserByUsername(login);
  if (existing) {
    return existing; // já criado em boot anterior — não sobrescrever
  }
  const admin = createUser({ username: login, password, name: 'Administrador', role: 'admin' });
  console.log(`[admin] Conta administradora criada para "${login}".`);
  return admin;
}

export function now() {
  return Date.now();
}

export function logActivity({ userId = null, username = null, action, detail = null, ip = null }) {
  try {
    db.prepare(
      'INSERT INTO activity_log (user_id, username, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, username, action, detail, ip, now());
  } catch (e) {
    console.error('[log] falha ao registrar atividade:', e.message);
  }
  console.log(`[log] ${action}${username ? ' · ' + username : ''}${detail ? ' · ' + detail : ''}${ip ? ' · ip=' + ip : ''}`);
}
