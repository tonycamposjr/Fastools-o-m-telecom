/**
 * csrf.js — proteção CSRF por double-submit cookie.
 *
 * O token fica num cookie legível (csrf) e deve ser ecoado no header
 * X-CSRF-Token em toda requisição de escrita (POST/PUT/PATCH/DELETE).
 */
import { randomToken, safeEqualStr } from './util.js';
import { SESSION_COOKIE } from './auth.js';

export function ensureCsrfToken(req, res, next) {
  if (!req.cookies?.csrf) {
    const token = randomToken();
    res.cookie('csrf', token, {
      httpOnly: false, // precisa ser legível pelo front para ecoar no header
      sameSite: 'lax',
      secure: res.locals.secureCookies === true,
      maxAge: 7 * 24 * 3600 * 1000,
      path: '/',
    });
    req.cookies.csrf = token; // disponível para a própria requisição
  }
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Escritas SEM sessão autenticada não tocam em dados de usuário (o cookie de
 * sessão não é anexado a requisições cross-site por SameSite=Lax), então a
 * exigência estrita vale sempre que há sessão ativa. Com sessão, header e
 * cookie devem bater em tempo constante.
 */
export function requireCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!req.cookies?.[SESSION_COOKIE]) return next();
  const cookieToken = req.cookies?.csrf;
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || !safeEqualStr(cookieToken, headerToken)) {
    return res.status(403).json({ error: 'Token CSRF inválido ou ausente.' });
  }
  next();
}
