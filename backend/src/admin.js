/**
 * admin.js — rotas exclusivas do papel "admin".
 *
 * Todas exigem sessão válida + requireAdmin verificado no backend.
 * O admin pode gestionar usuários, acessar/excluir dados e arquivos de
 * qualquer usuário e consultar os logs de atividade.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from './files.js';
import { db, logActivity, now } from './db.js';
import { requireAuth, requireAdmin } from './guards.js';
import { isValidUsername, isValidPassword, clientIp } from './util.js';

export function createAdminRouter() {
  const router = Router();
  router.use(requireAuth, requireAdmin);

  /* ----------------------------------------------------------------- */
  /* Usuários                                                           */
  /* ----------------------------------------------------------------- */

  router.get('/users', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT u.id, u.username, u.name, u.role, u.active, u.created_at,
                (SELECT COUNT(*) FROM otdr_traces t WHERE t.user_id = u.id) AS trace_count,
                (SELECT COUNT(*) FROM files f WHERE f.user_id = u.id)       AS file_count
           FROM users u ORDER BY u.created_at DESC`
      )
      .all();
    res.json(
      rows.map((r) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        role: r.role,
        active: !!r.active,
        createdAt: new Date(r.created_at).toISOString(),
        traceCount: r.trace_count,
        fileCount: r.file_count,
      }))
    );
  });

  router.post('/users', async (req, res) => {
    const b = req.body || {};
    const username = typeof b.username === 'string' ? b.username.trim() : '';
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Nome de usuário inválido (3–32, letras/números . _ -).' });
    }
    if (!isValidPassword(b.password)) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres.' });
    }
    const role = b.role === 'admin' ? 'admin' : 'user';
    const active = b.active === false ? 0 : 1;
    try {
      const hash = await bcrypt.hash(b.password, 12);
      const id = 'u_' + crypto.randomUUID().replace(/-/g, '');
      db.prepare(
        'INSERT INTO users (id, username, name, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, username, b.name ? String(b.name).trim().slice(0, 200) : null, hash, role, active, now());
      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'admin.user.create',
        detail: `${username} (${role})`,
        ip: clientIp(req),
      });
      res.status(201).json({ id, username, role, active: !!active });
    } catch (e) {
      if (e && /UNIQUE constraint/i.test(String(e.message))) {
        return res.status(409).json({ error: 'Nome de usuário já está em uso.' });
      }
      console.error('[admin] falha ao criar usuário:', e.message);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  /** Redefinir senha / renomear / ativar-desativar / alterar papel. */
  router.patch('/users/:id', async (req, res) => {
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const b = req.body || {};
    const isSelf = target.id === req.user.id;
    const updates = {};

    if (b.password !== undefined) {
      if (!isValidPassword(b.password)) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres.' });
      }
      updates.password_hash = await bcrypt.hash(b.password, 12);
    }
    if (b.name !== undefined) {
      updates.name = b.name === null ? null : String(b.name).trim().slice(0, 200);
    }
    if (b.active !== undefined) {
      if (isSelf && b.active === false) {
        return res.status(400).json({ error: 'Você não pode desativar a própria conta.' });
      }
      if (target.role === 'admin') {
        // Impede apagar o último admin ativo
        const others = db
          .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1 AND id != ?")
          .get(target.id);
        if (b.active === false && others.c === 0) {
          return res.status(400).json({ error: 'Não é possível desativar o único administrador ativo.' });
        }
      }
      updates.active = b.active ? 1 : 0;
      // sessões são mantidas: o guard rejeita contas desativadas a cada
      // requisição (e a reativação volta a valer com a sessão original)
    }
    if (b.password !== undefined && updates.password_hash) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id); // senha trocada → encerra sessões
    }
    if (b.role !== undefined) {
      if (isSelf) return res.status(400).json({ error: 'Você não pode alterar o próprio papel.' });
      if (!['user', 'admin'].includes(b.role)) {
        return res.status(400).json({ error: 'Papel inválido.' });
      }
      if (target.role === 'admin' && b.role === 'user') {
        const others = db
          .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")
          .get(target.id);
        if (others.c <= 1) {
          return res.status(400).json({ error: 'Não é possível remover o último administrador.' });
        }
      }
      updates.role = b.role;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nada a atualizar.' });
    }

    const fields = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...Object.values(updates), target.id);

    logActivity({
      userId: req.user.id,
      username: req.user.username,
      action: 'admin.user.update',
      detail: `${target.username} (${Object.keys(updates).join(', ')})`,
      ip: clientIp(req),
    });
    res.json({ ok: true });
  });

  /** Excluir usuário + TODO o espaço de dados dele (traços, arquivos, sessões). */
  router.delete('/users/:id', (req, res) => {
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (target.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir a própria conta.' });
    }
    deleteUserCascade(target);
    logActivity({
      userId: req.user.id,
      username: req.user.username,
      action: 'admin.user.delete',
      detail: target.username,
      ip: clientIp(req),
    });
    res.json({ ok: true });
  });

  /* ----------------------------------------------------------------- */
  /* Visão total de dados e arquivos (para administração/auditoria)     */
  /* ----------------------------------------------------------------- */

  router.get('/traces', (req, res) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : null;
    const rows = userId
      ? db.prepare('SELECT id, user_id, data, updated_at FROM otdr_traces WHERE user_id = ? ORDER BY updated_at DESC').all(userId)
      : db.prepare('SELECT id, user_id, data, updated_at FROM otdr_traces ORDER BY updated_at DESC LIMIT 500').all();
    res.json(
      rows.map((r) => {
        const data = JSON.parse(r.data);
        return {
          id: r.id,
          userId: r.user_id,
          fileName: data.fileName || null,
          fiberLengthKm: data.fiberLengthKm ?? null,
          wavelengthNm: data.wavelengthNm ?? null,
          updatedAt: new Date(r.updated_at).toISOString(),
        };
      })
    );
  });

  router.delete('/traces/:id', (req, res) => {
    const info = db.prepare('DELETE FROM otdr_traces WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Traço não encontrado.' });
    logActivity({
      userId: req.user.id,
      username: req.user.username,
      action: 'admin.trace.delete',
      detail: req.params.id,
      ip: clientIp(req),
    });
    res.json({ ok: true });
  });

  router.get('/files', (req, res) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : null;
    const rows = userId
      ? db.prepare('SELECT f.*, u.username FROM files f JOIN users u ON u.id = f.user_id WHERE f.user_id = ?').all(userId)
      : db.prepare('SELECT f.*, u.username FROM files f JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 500').all();
    res.json(
      rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        originalName: r.original_name,
        size: r.size,
        createdAt: new Date(r.created_at).toISOString(),
      }))
    );
  });

  router.delete('/files/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Arquivo não encontrado.' });
    try {
      fs.rmSync(row.stored_path, { force: true });
    } catch (e) {
      console.error('[admin] falha ao remover arquivo:', e.message);
    }
    db.prepare('DELETE FROM files WHERE id = ?').run(row.id);
    logActivity({
      userId: req.user.id,
      username: req.user.username,
      action: 'admin.file.delete',
      detail: row.original_name,
      ip: clientIp(req),
    });
    res.json({ ok: true });
  });

  /* ----------------------------------------------------------------- */
  /* Logs de atividade                                                  */
  /* ----------------------------------------------------------------- */

  router.get('/logs', (req, res) => {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 150));
    const rows = db
      .prepare(
        'SELECT id, user_id, username, action, detail, ip, created_at FROM activity_log ORDER BY id DESC LIMIT ?'
      )
      .all(limit);
    res.json(
      rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        action: r.action,
        detail: r.detail,
        ip: r.ip,
        at: new Date(r.created_at).toISOString(),
      }))
    );
  });

  return router;
}

/** Remove usuário + traços + configurações + sessões + arquivos físicos. */
function deleteUserCascade(user) {
  const files = db.prepare('SELECT stored_path FROM files WHERE user_id = ?').all(user.id);
  for (const f of files) {
    try {
      fs.rmSync(f.stored_path, { force: true });
    } catch (e) {
      console.error('[admin] falha ao remover arquivo:', e.message);
    }
  }
  try {
    fs.rmSync(path.join(UPLOAD_DIR, user.id), { recursive: true, force: true });
  } catch (e) {
    console.error('[admin] falha ao remover pasta do usuário:', e.message);
  }
  db.prepare('DELETE FROM files WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM otdr_traces WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM otdr_settings WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM login_attempts WHERE username = ?').run(user.username);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
}
