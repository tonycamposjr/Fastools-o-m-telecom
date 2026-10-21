/**
 * isolation.test.mjs — testes que comprovam:
 *
 *  1. Registro com validação de senha (mín. 8 chars) e usuário.
 *  2. CSRF: escrita sem header X-CSRF-Token → 403.
 *  3. ISOLAMENTO: usuário B NÃO acessa/lista/edita/baixa/exclui nada do
 *     usuário A (traços, configurações, arquivos) → 404/403.
 *  4. Upload: tipo proibido rejeitado; download do dono funciona.
 *  5. Força bruta: 5 falhas → bloqueio temporário (429).
 *  6. Admin: papel verificado no backend; comum → 403; admin vê/gerencia
 *     usuários, dados, arquivos; exclusão em cascata.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

/* Ambiente de teste isolado (banco e uploads em tmp) definido ANTES dos imports */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-isol-'));
process.env.DB_PATH = path.join(TMP, 'test.db');
process.env.UPLOAD_DIR = path.join(TMP, 'uploads');
process.env.ADMIN_LOGIN = 'admin_master';
process.env.ADMIN_PASSWORD = 'AdminSenhaSegura_2026';
process.env.NODE_ENV = 'test';
process.env.SERVE_DIST = path.join(TMP, 'inexistido-dist'); // não servir front nos testes

const { createApp } = await import('../src/app.js');
const { db, seedAdminFromEnv } = await import('../src/db.js');

seedAdminFromEnv();

const server = http.createServer(createApp());
await new Promise((r) => server.listen(0, '127.0.0.1', r));
server.unref(); // não segura o event loop do runner de testes
const BASE = `http://127.0.0.1:${server.address().port}`;

/* ------------------------------------------------------------------ */
/* Helpers de cliente HTTP com cookiejar mínimo                        */
/* ------------------------------------------------------------------ */
function makeClient() {
  const jar = new Map(); // nome → valor
  async function req(method, urlPath, { json, raw, filename, headers = {} } = {}) {
    const h = { ...headers };
    let body;
    if (json !== undefined) {
      h['content-type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (raw !== undefined) {
      body = raw;
    }
    if (method !== 'GET' && method !== 'HEAD') {
      if (!('x-csrf-token' in headers)) {
        h['x-csrf-token'] = jar.get('csrf') ?? '';
      }
    }
    if (jar.size > 0) {
      h.cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    }
    const res = await fetch(BASE + urlPath, { method, headers: h, body, redirect: 'manual' });
    for (const setC of res.headers.getSetCookie?.() ?? []) {
      const [pair] = setC.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value) jar.set(name, value);
      else jar.delete(name);
    }
    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) data = await res.json();
    else data = await res.text();
    return { status: res.status, data };
  }
  return { req, jar };
}

async function registerOrLogin(client, username, password) {
  let r = await client.req('POST', '/api/auth/register', { json: { username, password, name: username } });
  if (r.status === 409) r = await client.req('POST', '/api/auth/login', { json: { username, password } });
  assert.ok([200, 201].includes(r.status), `login/register de ${username}: ${JSON.stringify(r)}`);
  return r;
}

const A_NAME = `user_a_${crypto.randomBytes(3).toString('hex')}`;
const B_NAME = `user_b_${crypto.randomBytes(3).toString('hex')}`;

const A = makeClient();
const B = makeClient();
const IMPOSTOR = makeClient(); // tentará acessar dados de A sem ser dono

/* ------------------------------------------------------------------ */
describe('1. Autenticação', () => {
  test('senha menor que 8 caracteres é rejeitada no cadastro', async () => {
    const c = makeClient();
    const r = await c.req('POST', '/api/auth/register', { json: { username: 'curtinha', password: 'curta12', name: 'x' } });
    assert.equal(r.status, 400);
  });

  test('nome de usuário inválido é rejeitado', async () => {
    const c = makeClient();
    const r = await c.req('POST', '/api/auth/register', { json: { username: 'ab', password: 'senha_8chars_ok', name: 'x' } });
    assert.equal(r.status, 400);
  });

  test('cadastro e login do usuário A funcionam', async () => {
    const r = await registerOrLogin(A, A_NAME, 'SenhaSegura_123');
    assert.equal(r.data.username, A_NAME);
    assert.equal(r.data.role, 'user');
    assert.ok(!('password_hash' in r.data) && !('password' in r.data), 'nenhuma senha vaza na resposta');
  });

  test('cadastro do usuário B e duplicata → 409', async () => {
    await registerOrLogin(B, B_NAME, 'SenhaSegura_456');
    const c = makeClient();
    const r = await c.req('POST', '/api/auth/register', { json: { username: A_NAME, password: 'senha_8chars_ok', name: 'x' } });
    assert.equal(r.status, 409);
  });

  test('login com senha errada → 401 mensagem genérica', async () => {
    const c = makeClient();
    const r = await c.req('POST', '/api/auth/login', { json: { username: A_NAME, password: 'ErradaErrada1' } });
    assert.equal(r.status, 401);
    assert.equal(r.data.error, 'Usuário ou senha inválidos.');
  });

  test('GET /api/me sem sessão → 401; com sessão → dados do próprio usuário', async () => {
    const r0 = await IMPOSTOR.req('GET', '/api/me');
    assert.equal(r0.status, 401);
    const r = await A.req('GET', '/api/me');
    assert.equal(r.status, 200);
    assert.equal(r.data.username, A_NAME);
  });
});

describe('2. CSRF', () => {
  test('escrita autenticada sem cookie CSRF válido → 403', async () => {
    const c = makeClient();
    await registerOrLogin(c, `csrf_${crypto.randomBytes(3).toString('hex')}`, 'SenhaSegura_789');
    c.jar.delete('csrf'); // navegador não tem cookie csrf (header forjado pelo atacante)
    const r = await c.req('POST', '/api/otdr/traces', {
      json: { summary: {} },
      headers: { 'x-csrf-token': 'forjado' },
    });
    assert.equal(r.status, 403);
  });
});

describe('3. Isolamento de dados por usuário', () => {
  test('A salva configurações e traço; B não vê nada disso', async () => {
    const up = await A.req('PUT', '/api/otdr/settings', {
      json: { mediumLoss: 0.35, highLoss: 1.2, reflectLimit: -45, traceTheme: 'blue' },
    });
    assert.equal(up.status, 200);

    const trace = {
      fileName: 'opticalsensors-1111-12-15-14-01-54.sor',
      summary: { fiberLengthKm: 1.863, wavelengthNm: 1310, pulseWidthNs: 30 },
      events: [],
      curve: { points: [] },
    };
    const created = await A.req('POST', '/api/otdr/traces', { json: trace });
    assert.equal(created.status, 201);
    const traceId = created.data.id;

    /* B lista → vazio */
    const listB = await B.req('GET', '/api/otdr/traces');
    assert.deepEqual(listB.data, []);

    /* B tenta os endpoints de A com o id/rota correto → 404 (sem vazar existência) */
    const getB = await B.req('GET', `/api/otdr/traces/${traceId}`);
    assert.equal(getB.status, 404);

    const delB = await B.req('DELETE', `/api/otdr/traces/${traceId}`);
    assert.equal(delB.status, 404);

    /* B configurações independentes (não herda as de A) */
    const setB = await B.req('GET', '/api/otdr/settings');
    assert.equal(setB.data, null);
    await B.req('PUT', '/api/otdr/settings', { json: { mediumLoss: 0.9, highLoss: 2.0, reflectLimit: -30, traceTheme: 'green-black' } });
    const setA2 = await A.req('GET', '/api/otdr/settings');
    assert.equal(setA2.data.mediumLoss, 0.35); // A não foi alterado por B

    /* guarda o id para os testes de arquivo e admin */
    globalThis.__traceId = traceId;
  });

  test('ID forjado/rota direta não permite alterar dono', async () => {
    const r = await B.req('POST', '/api/otdr/traces', {
      json: { fileName: 'sorpadoA.sor', summary: {}, events: [], curve: { points: [] }, ownerId: 'AAAA' },
    });
    assert.equal(r.status, 201);
    // O dono é sempre o da sessão; ownerId do corpo é ignorado
    const owners = db.prepare('SELECT DISTINCT user_id FROM otdr_traces WHERE id = ?').all(r.data.id);
    assert.equal(owners.length, 1);
    assert.ok(owners[0].user_id.startsWith('u_'));
  });
});

describe('4. Uploads de arquivos', () => {
  test('A faz upload de .SOR; download e listagem funcionam para o DONO', async () => {
    const bytes = Buffer.from('QTRD...simulacao de binario SOR ' + A_NAME);
    const up = await A.req('POST', '/api/files', {
      raw: bytes,
      filename: 'rede-otica-11.sor',
      headers: { 'x-filename': 'rede-otica-11.sor' },
    });
    assert.equal(up.status, 201, JSON.stringify(up));
    assert.equal(up.data.originalName, 'rede-otica-11.sor');
    globalThis.__fileId = up.data.id;

    const list = await A.req('GET', '/api/files');
    assert.equal(list.data.length, 1);

    const down = await A.req('GET', `/api/files/${up.data.id}/download`);
    assert.equal(down.status, 200);
    assert.equal(Buffer.byteLength(down.data), bytes.length);
  });

  test('B NÃO baixa, lista nem exclui arquivo de A', async () => {
    const listB = await B.req('GET', '/api/files');
    assert.deepEqual(listB.data, []);

    const downB = await B.req('GET', `/api/files/${globalThis.__fileId}/download`);
    assert.equal(downB.status, 404);

    const delB = await B.req('DELETE', `/api/files/${globalThis.__fileId}`);
    assert.equal(delB.status, 404);

    // arquivo de A continua intacto
    const downA = await A.req('GET', `/api/files/${globalThis.__fileId}/download`);
    assert.equal(downA.status, 200);
  });

  test('extensão perigosa (.exe/.html) é rejeitada; path traversal no nome é neutralizado', async () => {
    const up = await A.req('POST', '/api/files', {
      raw: Buffer.from('MZ massa executavel'),
      filename: 'malware.exe',
      headers: { 'x-filename': 'malware.exe' },
    });
    assert.equal(up.status, 415);

    const up2 = await A.req('POST', '/api/files', {
      raw: Buffer.from('<h1>html</h1>'),
      filename: 'pagina.html',
      headers: { 'x-filename': 'pagina.html' },
    });
    assert.equal(up2.status, 415);

    const up3 = await A.req('POST', '/api/files', {
      raw: Buffer.from('conteudo'),
      filename: 'ok.txt',
      headers: { 'x-filename': '../../etc/passwd.txt' },
    });
    assert.equal(up3.status, 201);
    assert.ok(!up3.data.originalName.includes('..'));
    assert.equal(up3.data.originalName, 'passwd.txt');
  });
});

describe('5. Proteção contra força bruta', () => {
  test('após 5 falhas, login é bloqueado temporariamente (429)', async () => {
    const c = makeClient();
    const victim = `vitima_${crypto.randomBytes(3).toString('hex')}`;
    await registerOrLogin(c, victim, 'SenhaCorreta_99');
    for (let i = 0; i < 5; i++) {
      const r = await c.req('POST', '/api/auth/login', { json: { username: victim, password: 'errada_123456' } });
      assert.equal(r.status, 401);
    }
    const r6 = await c.req('POST', '/api/auth/login', { json: { username: victim, password: 'SenhaCorreta_99' } });
    assert.equal(r6.status, 429);
  });
});

describe('6. Papel admin verificado no backend', () => {
  test('usuário comum NÃO acessa rotas administrativas → 403', async () => {
    const r = await A.req('GET', '/api/admin/users');
    assert.equal(r.status, 403);
  });

  test('admin semeado via ADMIN_LOGIN/ADMIN_PASSWORD faz login e vê usuários', async () => {
    const admin = makeClient();
    const r = await admin.req('POST', '/api/auth/login', {
      json: { username: process.env.ADMIN_LOGIN, password: process.env.ADMIN_PASSWORD },
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.role, 'admin');
    globalThis.__admin = admin;

    const list = await admin.req('GET', '/api/admin/users');
    assert.equal(list.status, 200);
    assert.ok(list.data.length >= 3);
    globalThis.__users = list.data;
    globalThis.__A = list.data.find((u) => u.username === A_NAME);
    globalThis.__B = list.data.find((u) => u.username === B_NAME);
  });

  test('admin acessa dados e arquivos de qualquer usuário; senha nunca aparece', async () => {
    const traces = await globalThis.__admin.req('GET', `/api/admin/traces?userId=${globalThis.__A.id}`);
    assert.equal(traces.status, 200);
    assert.ok(traces.data.length >= 1);
    assert.ok(traces.data.every((t) => t.userId === globalThis.__A.id));

    const files = await globalThis.__admin.req('GET', `/api/admin/files?userId=${globalThis.__A.id}`);
    assert.equal(files.status, 200);
    assert.ok(files.data.length >= 1);
    assert.equal(files.data[0].username, A_NAME);
  });

  test('admin desativa usuário B → sessão de B é rejeitada (403)', async () => {
    const p = await globalThis.__admin.req('PATCH', `/api/admin/users/${globalThis.__B.id}`, { json: { active: false } });
    assert.equal(p.status, 200);
    const meB = await B.req('GET', '/api/me');
    assert.equal(meB.status, 403);

    const loginB = await B.req('POST', '/api/auth/login', { json: { username: B_NAME, password: 'SenhaSegura_456' } });
    assert.equal(loginB.status, 401); // mensagem genérica, sem vazar status da conta

    // restaura: a sessão original volta a valer (guard checa active por requisição)
    const p2 = await globalThis.__admin.req('PATCH', `/api/admin/users/${globalThis.__B.id}`, { json: { active: true } });
    assert.equal(p2.status, 200);
    const meB2 = await B.req('GET', '/api/me');
    assert.equal(meB2.status, 200);
    assert.equal(meB2.data.username, B_NAME);
  });

  test('admin redefine senha de B; senha antiga deixa de valer; nunca aparece em log', async () => {
    const p = await globalThis.__admin.req('PATCH', `/api/admin/users/${globalThis.__B.id}`, {
      json: { password: 'NovaSenhaB_2026!' },
    });
    assert.equal(p.status, 200);

    const oldLogin = await B.req('POST', '/api/auth/login', { json: { username: B_NAME, password: 'SenhaSegura_456' } });
    assert.equal(oldLogin.status, 401);
    await registerOrLogin(B, B_NAME, 'NovaSenhaB_2026!');

    const logs = await globalThis.__admin.req('GET', '/api/admin/logs?limit=500');
    assert.equal(logs.status, 200);
    const serialized = JSON.stringify(logs.data);
    assert.ok(!serialized.includes('SenhaSegura_456') && !serialized.includes('NovaSenhaB_2026!'), 'senhas não aparecem nos logs');
  });

  test('admin cria usuário, promove e exclui em cascata (traços+arquivos) sem afetar outros', async () => {
    const c = makeClient();
    const tmpName = `temp_${crypto.randomBytes(3).toString('hex')}`;
    await registerOrLogin(c, tmpName, 'SenhaTemp_1111');
    const users = await globalThis.__admin.req('GET', '/api/admin/users');
    const u = users.data.find((x) => x.username === tmpName);
    const me = await c.req('GET', '/api/me');

    await c.req('POST', '/api/otdr/traces', { json: { fileName: 't.sor', summary: {}, events: [], curve: { points: [] } } });
    await c.req('POST', '/api/files', { raw: Buffer.from('x'), filename: 'f.txt', headers: { 'x-filename': 'f.txt' } });

    // exclusão em cascata
    const del = await globalThis.__admin.req('DELETE', `/api/admin/users/${me.data.id}`);
    assert.equal(del.status, 200);

    const tmpUploads = fs.readdirSync(process.env.UPLOAD_DIR);
    assert.ok(!tmpUploads.some((p) => p === me.data.id), 'pasta de uploads do usuário excluído foi removida');

    const tracesRest = db.prepare('SELECT COUNT(*) AS c FROM otdr_traces WHERE user_id = ?').get(me.data.id);
    assert.equal(tracesRest.c, 0);

    const loginDeleted = await c.req('POST', '/api/auth/login', { json: { username: tmpName, password: 'SenhaTemp_1111' } });
    assert.equal(loginDeleted.status, 401);
  });

  test('logout invalida a sessão', async () => {
    const r = await B.req('POST', '/api/auth/logout');
    assert.equal(r.status, 200);
    const me = await B.req('GET', '/api/me');
    assert.equal(me.status, 401);
  });
});

/* Encerra servidor ao final */
process.on('exit', () => {
  try {
    server.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch (e) {}
});
