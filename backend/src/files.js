/**
 * files.js — upload/downloads de arquivos por usuário.
 *
 * Cada usuário grava em /uploads/{user_id}/ com nome armazenado aleatório
 * (impede path traversal e sobreposição), extensão listada em whitelist,
 * tamanho limitado e download SEMPRE com checagem de dono + attachment
 * (sem execução/no sniff).
 */
import { Router } from 'express';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, logActivity, now } from './db.js';
import { randomId, sanitizeFilename, clientIp } from './util.js';

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024; // 30 MB
const ALLOWED_EXT = new Set([
  '.sor', '.kml', '.kmz', '.png', '.jpg', '.jpeg', '.pdf', '.csv', '.json', '.txt', '.xml', '.zip',
]);

export function createFilesRouter() {
  const router = Router();
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  /** Upload: corpo binário bruto com metadados no header (sem multipart). */
  router.post(
    '/',
    express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES + 1024 }),
    (req, res) => {
      const body = req.body;
      if (!body || !Buffer.isBuffer(body) || body.length === 0) {
        return res.status(400).json({ error: 'Envie o conteúdo do arquivo no corpo da requisição.' });
      }
      if (body.length > MAX_UPLOAD_BYTES) {
        return res.status(413).json({ error: 'Arquivo maior que 30 MB.' });
      }

      const original = sanitizeFilename(req.get('x-filename') || 'arquivo');
      const ext = path.extname(original).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        return res.status(415).json({
          error: `Tipo de arquivo não permitido (${ext || 'sem extensão'}). Permitidos: ${[...ALLOWED_EXT].join(', ')}.`,
        });
      }

      const userDir = path.join(UPLOAD_DIR, req.user.id); // pasta por usuário
      fs.mkdirSync(userDir, { recursive: true });
      const storedName = randomId('f_') + ext;
      const storedPath = path.join(userDir, storedName);
      fs.writeFileSync(storedPath, body);

      const id = randomId('file_');
      db.prepare(
        'INSERT INTO files (id, user_id, original_name, stored_path, size, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, req.user.id, original, storedPath, body.length, now());

      logActivity({
        userId: req.user.id,
        username: req.user.username,
        action: 'file.upload',
        detail: `${original} (${body.length} B)`,
        ip: clientIp(req),
      });

      res.status(201).json({ id, originalName: original, size: body.length, createdAt: new Date().toISOString() });
    }
  );

  /** Listagem: SOMENTE do próprio usuário. */
  router.get('/', (req, res) => {
    const rows = db
      .prepare('SELECT id, original_name, size, created_at FROM files WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user.id);
    res.json(
      rows.map((r) => ({
        id: r.id,
        originalName: r.original_name,
        size: r.size,
        createdAt: new Date(r.created_at).toISOString(),
      }))
    );
  });

  /** Download: checagem de dono no backend; attachment + octet-stream. */
  router.get('/:id/download', (req, res) => {
    const row = db
      .prepare('SELECT * FROM files WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Arquivo não encontrado.' });
    if (!fs.existsSync(row.stored_path)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }
    const asciiName = row.original_name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(row.original_name)}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(row.stored_path);
  });

  /** Exclusão: checagem de dono no backend. */
  router.delete('/:id', (req, res) => {
    const row = db
      .prepare('SELECT * FROM files WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Arquivo não encontrado.' });
    try {
      fs.rmSync(row.stored_path, { force: true });
    } catch (e) {
      console.error('[files] falha ao remover arquivo do disco:', e.message);
    }
    db.prepare('DELETE FROM files WHERE id = ?').run(row.id);
    logActivity({
      userId: req.user.id,
      username: req.user.username,
      action: 'file.delete',
      detail: row.original_name,
      ip: clientIp(req),
    });
    res.json({ ok: true });
  });

  return router;
}
