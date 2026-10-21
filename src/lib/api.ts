/**
 * api.ts — cliente do backend de contas próprio (substitui o Firebase
 * do módulo OTDR). Sessão por cookie HttpOnly; CSRF via header
 * X-CSRF-Token ecoando o cookie `csrf`.
 */
export interface AuthUser {
  id: string;
  username: string;
  name: string | null;
  role: 'user' | 'admin';
}

export interface OtdrSettings {
  mediumLoss: number;
  highLoss: number;
  reflectLimit: number;
  traceTheme: string;
}

export interface OtdrFileRow {
  id: string;
  originalName: string;
  size: number;
  createdAt: string;
}

export interface AdminUserRow {
  id: string;
  username: string;
  name: string | null;
  role: 'user' | 'admin';
  active: boolean;
  createdAt: string;
  traceCount: number;
  fileCount: number;
}

export interface AdminTraceRow {
  id: string;
  userId: string;
  fileName: string | null;
  fiberLengthKm: number | null;
  wavelengthNm: number | null;
  updatedAt: string;
}

export interface AdminFileRow {
  id: string;
  userId: string;
  username: string;
  originalName: string;
  size: number;
  createdAt: string;
}

export interface LogRow {
  id: number;
  userId: string | null;
  username: string | null;
  action: string;
  detail: string | null;
  ip: string | null;
  at: string;
}

function csrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)csrf=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (method !== 'GET' && method !== 'HEAD') {
    headers['X-CSRF-Token'] = csrfToken();
  }

  const res = await fetch(path, { method, headers, credentials: 'same-origin', body });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* resposta sem corpo json */
  }
  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || `Erro ${res.status}`);
  }
  return data as T;
}

/* ------------------------------------------------------------------ */
/* Autenticação                                                        */
/* ------------------------------------------------------------------ */

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const me = await request<any>('/api/me');
    // Backend real responde com o objeto da conta; se vier null (ex.: SPA
    // devolvendo index.html para /api), trate como servidor indisponível.
    if (me && typeof me === 'object' && me.id) return me as AuthUser;
    throw new ApiError(500, 'Resposta inválida do servidor');
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      if (e.status === 403) {
        // Sessão ativa de conta desativada — encerra localmente e no servidor
        try {
          await request('/api/auth/logout', { method: 'POST' });
        } catch {}
      }
      return null;
    }
    throw e;
  }
}

export async function register(username: string, password: string, name: string): Promise<AuthUser> {
  return request<AuthUser>('/api/auth/register', { method: 'POST', body: { username, password, name } });
}

export async function login(username: string, password: string): Promise<AuthUser> {
  return request<AuthUser>('/api/auth/login', { method: 'POST', body: { username, password } });
}

export async function logout(): Promise<void> {
  await request('/api/auth/logout', { method: 'POST' });
}

/* ------------------------------------------------------------------ */
/* OTDR: configurações e traços                                        */
/* ------------------------------------------------------------------ */

export async function getOtdrSettings(): Promise<OtdrSettings | null> {
  return request<OtdrSettings | null>('/api/otdr/settings');
}

export async function saveOtdrSettings(payload: OtdrSettings): Promise<OtdrSettings> {
  return request<OtdrSettings>('/api/otdr/settings', { method: 'PUT', body: payload });
}

export async function listTraces(): Promise<any[]> {
  return request<any[]>('/api/otdr/traces');
}

export async function saveTrace(traceObj: unknown): Promise<{ id: string }> {
  return request<{ id: string }>('/api/otdr/traces', { method: 'POST', body: traceObj });
}

export async function deleteTrace(id: string): Promise<void> {
  await request(`/api/otdr/traces/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/* Arquivos do usuário (uploads)                                       */
/* ------------------------------------------------------------------ */

export async function listFiles(): Promise<OtdrFileRow[]> {
  return request<OtdrFileRow[]>('/api/files');
}

export async function uploadFile(file: File): Promise<OtdrFileRow> {
  const res = await fetch('/api/files', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'X-Filename': encodeURIComponent(file.name),
      'X-CSRF-Token': csrfToken(),
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data && data.error) || `Erro ${res.status}`);
  return data as OtdrFileRow;
}

export async function deleteFile(id: string): Promise<void> {
  await request(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function downloadFile(id: string, originalName: string): Promise<void> {
  const res = await fetch(`/api/files/${encodeURIComponent(id)}/download`, { credentials: 'same-origin' });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new ApiError(res.status, msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = originalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ------------------------------------------------------------------ */
/* Administração (apenas papel admin — verificado no servidor)         */
/* ------------------------------------------------------------------ */

export const admin = {
  listUsers: () => request<AdminUserRow[]>('/api/admin/users'),
  createUser: (payload: { username: string; password: string; name?: string; role?: 'user' | 'admin' }) =>
    request<{ id: string }>('/api/admin/users', { method: 'POST', body: payload }),
  updateUser: (id: string, payload: { password?: string; name?: string; active?: boolean; role?: 'user' | 'admin' }) =>
    request<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  deleteUser: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listTraces: (userId?: string) =>
    request<AdminTraceRow[]>(`/api/admin/traces${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),
  deleteTrace: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/traces/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listFiles: (userId?: string) =>
    request<AdminFileRow[]>(`/api/admin/files${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),
  deleteFile: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/files/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listLogs: (limit = 150) => request<LogRow[]>(`/api/admin/logs?limit=${limit}`),
};
