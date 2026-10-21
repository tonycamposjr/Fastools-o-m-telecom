/**
 * otdr.js — configurações e traços OTDR por usuário.
 *
 * O usuário vem SEMPRE da SESSÃO (req.user.id) — nunca de parâmetros do
 * cliente. O id do traço é gerado no servidor para evitar colisão/squatting
 * entre contas. Qualquer id que não pertence ao usuário → 404 (não 403,
 * para não vazar existência de recursos de terceiros).
 */
import { Router } from 'express';
import { db, logActivity, now } from './db.js';
import { randomId, clientIp } from './util.js';

const MAX_TRACE_JSON_BYTES = 12 * 1024 * 1024; // 12 MB por traço com curva completa

export function createOtdrRouter() {
  const router = Router();

  /* --------------------------------------------------------------------- */
  /* Configurações (limiares e tema do gráfico)                             */
  /* --------------------------------------------------------------------- */

  router.get('/settings', (req, res) => {
    const row = db.prepare('SELECT data FROM otdr_settings WHERE user_id = ?').get(req.user.id);
    res.json(row ? JSON.parse(row.data) : null);
  });

  router.put('/settings', (req, res) => {
    const b = req.body || {};
    const payload = {
      mediumLoss: clampNumber(b.mediumLoss, 0, 10, 0.4),
      highLoss: clampNumber(b.highLoss, 0, 30, 1.0),
      reflectLimit: clampNumber(b.reflectLimit, -100, 0, -40),
      traceTheme: ['blue', 'orange-black', 'green-black'].includes(b.traceTheme)
        ? b.traceTheme
        : 'orange-black',
    };
    db.prepare(
      `INSERT INTO otdr_settings (user_id, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    ).run(req.user.id, JSON.stringify(payload), now());
    res.json(payload);
  });

  /* --------------------------------------------------------------------- */
  /* Traços salvos (histórico na nuvem)                                     */
  /* --------------------------------------------------------------------- */

  router.get('/traces', (req, res) => {
    const rows = db
      .prepare('SELECT data FROM otdr_traces WHERE user_id = ? ORDER BY updated_at DESC')
      .all(req.user.id);
    res.json(rows.map((r) => JSON.parse(r.data)));
  });

  router.post('/traces', (req, res) => {
    const b = req.body;
    if (!b || typeof b !== 'object' || Array.isArray(b) || !b.summary) {
      return res.status(400).json({ error: 'Objeto de traço inválido.' });
    }
    const json = JSON.stringify(b);
    if (Buffer.byteLength(json) > MAX_TRACE_JSON_BYTES) {
      return res.status(413).json({ error: 'Traço grande demais para salvar.' });
    }
    const id = randomId('tr_');
    db.prepare('INSERT INTO otdr_traces (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)').run(
      id,
      req.user.id,
      json,
      now()
    );
    logActivity({
      userId: req.user.id,
      username: req.user.username,
      action: 'otdr.trace.create',
      detail: String(b.fileName || '').slice(0, 100),
      ip: clientIp(req),
    });
    res.status(201).json({ id });
  });

  router.get('/traces/:id', (req, res) => {
    const row = db
      .prepare('SELECT data FROM otdr_traces WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Traço não encontrado.' });
    res.json(JSON.parse(row.data));
  });

  router.delete('/traces/:id', (req, res) => {
    const info = db
      .prepare('DELETE FROM otdr_traces WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Traço não encontrado.' });
    logActivity({
      userId: req.user.id,
      username: req.user.username,
      action: 'otdr.trace.delete',
      detail: req.params.id,
      ip: clientIp(req),
    });
    res.json({ ok: true });
  });

  return router;
}

function clampNumber(v, min, max, def) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
