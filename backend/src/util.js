/**
 * util.js — utilidades de segurança compartilhadas
 */
import crypto from 'node:crypto';

export function randomId(prefix = '') {
  return prefix + crypto.randomBytes(12).toString('hex');
}

export function randomToken() {
  return crypto.randomBytes(48).toString('base64url');
}

/** Comparação em tempo constante (via SHA-256; evita timing side-channel). */
export function safeEqualStr(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Nome de usuário: 3-32 chars, começa com letra/número. */
const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,31}$/;
export function isValidUsername(u) {
  return typeof u === 'string' && USERNAME_RE.test(u);
}

/** Senha comum: mínimo 8 caracteres. */
export function isValidPassword(p) {
  return typeof p === 'string' && p.length >= 8 && p.length <= 200;
}

/** Remove separadores de caminho e caracteres de controle do nome original. */
export function sanitizeFilename(name) {
  const base = String(name).split(/[/\\]/).pop() || '';
  const cleaned = base.replace(/[\u0000-\u001F\u007F"<>|:*?]/g, '').trim();
  return (cleaned || 'arquivo').slice(0, 120);
}

export function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    ''
  );
}

export function isEmailish(v) {
  return typeof v === 'string' && v.length <= 200;
}
