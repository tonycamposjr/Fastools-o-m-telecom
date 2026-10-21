/**
 * AdminTab.tsx — painel de administração (somente papel "admin",
 * verificado no backend em toda requisição). Gestão de usuários,
 * visualização de dados/arquivos de qualquer usuário e logs.
 */
import React, { useEffect, useState } from 'react';
import * as api from '../lib/api';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

type Section = 'users' | 'traces' | 'files' | 'logs';

const cardStyle: React.CSSProperties = {
  background: 'var(--card, #fff)',
  border: '1px solid var(--border, rgba(90,105,135,0.3))',
  borderRadius: '14px',
  padding: '16px',
  boxShadow: 'var(--shadow-sm, 0 3px 8px rgba(15,25,45,0.08))',
};

const btnStyle = (danger = false): React.CSSProperties => ({
  padding: '6px 12px',
  fontSize: '12.5px',
  fontWeight: 700,
  border: '1px solid ' + (danger ? 'rgba(200,60,60,0.5)' : 'rgba(90,105,135,0.35)'),
  borderRadius: '10px',
  background: danger ? 'rgba(200,60,60,0.12)' : 'rgba(120,140,180,0.12)',
  color: danger ? '#a32626' : 'inherit',
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 800,
  color: 'var(--muted, #5a6c8c)',
  padding: '8px 10px',
  borderBottom: '2px solid var(--border, rgba(90,105,135,0.3))',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  fontSize: '13px',
  padding: '8px 10px',
  borderBottom: '1px solid var(--border, rgba(90,105,135,0.18))',
};

export default function AdminTab({ showToast }: Props) {
  const [section, setSection] = useState<Section>('users');
  const [users, setUsers] = useState<api.AdminUserRow[]>([]);
  const [traces, setTraces] = useState<api.AdminTraceRow[]>([]);
  const [files, setFiles] = useState<api.AdminFileRow[]>([]);
  const [logs, setLogs] = useState<api.LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [u, t, f, l] = await Promise.all([
        api.admin.listUsers(),
        api.admin.listTraces(),
        api.admin.listFiles(),
        api.admin.listLogs(200),
      ]);
      setUsers(u);
      setTraces(t);
      setFiles(f);
      setLogs(l);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao carregar painel administrativo.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const reloadPartial = async (which: Section) => {
    try {
      if (which === 'users') setUsers(await api.admin.listUsers());
      if (which === 'traces') setTraces(await api.admin.listTraces());
      if (which === 'files') setFiles(await api.admin.listFiles());
      if (which === 'logs') setLogs(await api.admin.listLogs(200));
    } catch (e: any) {
      showToast(e?.message || 'Erro na operação.', 'error');
    }
  };

  const unwrap = async <T,>(p: Promise<T>, okMsg?: string): Promise<T | undefined> => {
    try {
      const r = await p;
      if (okMsg) showToast(okMsg, 'success');
      await reloadPartial(section);
      return r;
    } catch (e: any) {
      showToast(e?.message || 'Erro na operação.', 'error');
      return undefined;
    }
  };

  const actCreateUser = () => {
    const username = prompt('Nome de usuário (3–32, letras/números . _ -):');
    if (!username) return;
    const password = prompt('Senha (mínimo 8 caracteres):');
    if (!password || password.length < 8) {
      showToast('Senha inválida (mínimo 8 caracteres).', 'warning');
      return;
    }
    const role = confirm('Criar como administrador? (OK = admin / Cancelar = usuário comum)') ? 'admin' : 'user';
    void unwrap(api.admin.createUser({ username, password, role }), 'Usuário criado.');
  };

  const actResetPassword = (u: api.AdminUserRow) => {
    const password = prompt(`Nova senha para "${u.username}" (mínimo 8 caracteres):`);
    if (!password || password.length < 8) {
      showToast('Senha inválida (mínimo 8 caracteres).', 'warning');
      return;
    }
    void unwrap(api.admin.updateUser(u.id, { password }), 'Senha redefinida.');
  };

  const actToggleActive = (u: api.AdminUserRow) => {
    void unwrap(
      api.admin.updateUser(u.id, { active: !u.active }),
      u.active ? 'Conta desativada.' : 'Conta ativada.'
    );
  };

  const actDeleteUser = (u: api.AdminUserRow) => {
    if (!confirm(`Excluir "${u.username}" e TODOS os seus dados (traços, arquivo e uploads)?`)) return;
    void unwrap(api.admin.deleteUser(u.id), 'Usuário excluído com todos os dados.');
  };

  const actDeleteTrace = (t: api.AdminTraceRow) => {
    if (!confirm(`Excluir traço de ${t.fileName || t.id}?`)) return;
    void unwrap(api.admin.deleteTrace(t.id), 'Traço excluído.');
  };

  const actDeleteFile = (f: api.AdminFileRow) => {
    if (!confirm(`Excluir arquivo "${f.originalName}" (${f.username})?`)) return;
    void unwrap(api.admin.deleteFile(f.id), 'Arquivo excluído.');
  };

  const tabs: Array<{ id: Section; label: string; icon: string }> = [
    { id: 'users', label: 'Usuários', icon: 'fa-users' },
    { id: 'traces', label: 'Traços OTDR', icon: 'fa-wave-square' },
    { id: 'files', label: 'Arquivos', icon: 'fa-file' },
    { id: 'logs', label: 'Logs', icon: 'fa-clipboard-list' },
  ];

  return (
    <div className="admin-root" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="panel" style={cardStyle}>
        <div className="panel-title">Painel do Administrador</div>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted, #5a6c8c)' }}>
          Controle total: usuários, dados, arquivos e logs. Ações registradas em log (sem senhas).
        </p>

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              style={{
                ...btnStyle(),
                background: section === t.id ? 'linear-gradient(160deg, #5b8def, #2f5fdb)' : undefined,
                color: section === t.id ? '#fff' : undefined,
                borderColor: section === t.id ? 'rgba(47,111,219,0.6)' : undefined,
              }}
            >
              <i className={`fas ${t.icon}`} style={{ marginRight: '6px' }}></i>
              {t.label}
            </button>
          ))}
          <button onClick={actCreateUser} style={{ ...btnStyle(), marginLeft: 'auto' }}>
            <i className="fas fa-user-plus" style={{ marginRight: '6px' }}></i> Novo usuário
          </button>
        </div>
      </div>

      {loading ? (
        <div style={cardStyle}>Carregando...</div>
      ) : (
        <div className="panel" style={cardStyle}>
          {section === 'users' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Usuário</th>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Papel</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Traços</th>
                  <th style={thStyle}>Arquivos</th>
                  <th style={thStyle}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={tdStyle}><strong>@{u.username}</strong></td>
                    <td style={tdStyle}>{u.name || '—'}</td>
                    <td style={tdStyle}>{u.role === 'admin' ? 'admin' : 'usuário'}</td>
                    <td style={tdStyle}>{u.active ? 'ativa' : 'desativada'}</td>
                    <td style={tdStyle}>{u.traceCount}</td>
                    <td style={tdStyle}>{u.fileCount}</td>
                    <td style={tdStyle} className="admin-actions">
                      <button style={{ ...btnStyle(), marginRight: '6px' }} onClick={() => actResetPassword(u)}>
                        Nova senha
                      </button>
                      <button style={{ ...btnStyle(), marginRight: '6px' }} onClick={() => actToggleActive(u)}>
                        {u.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button style={btnStyle(true)} onClick={() => actDeleteUser(u)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {section === 'traces' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Dono</th>
                  <th style={thStyle}>Arquivo</th>
                  <th style={thStyle}>Comprimento</th>
                  <th style={thStyle}>λ</th>
                  <th style={thStyle}>Salvo em</th>
                  <th style={thStyle}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {traces.length === 0 && (
                  <tr><td style={tdStyle} colSpan={6}>Nenhum traço salvo por usuários.</td></tr>
                )}
                {traces.map((t) => (
                  <tr key={t.id}>
                    <td style={tdStyle}>{t.userId}</td>
                    <td style={tdStyle}>{t.fileName || t.id}</td>
                    <td style={tdStyle}>{t.fiberLengthKm != null ? `${t.fiberLengthKm} km` : '—'}</td>
                    <td style={tdStyle}>{t.wavelengthNm ?? '—'}</td>
                    <td style={tdStyle}>{new Date(t.updatedAt).toLocaleString('pt-BR')}</td>
                    <td style={tdStyle}>
                      <button style={btnStyle(true)} onClick={() => actDeleteTrace(t)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {section === 'files' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Dono</th>
                  <th style={thStyle}>Arquivo</th>
                  <th style={thStyle}>Tamanho</th>
                  <th style={thStyle}>Enviado em</th>
                  <th style={thStyle}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 && (
                  <tr><td style={tdStyle} colSpan={5}>Nenhum arquivo enviado.</td></tr>
                )}
                {files.map((f) => (
                  <tr key={f.id}>
                    <td style={tdStyle}>{f.username}</td>
                    <td style={tdStyle}>{f.originalName}</td>
                    <td style={tdStyle}>{(f.size / 1024).toFixed(1)} KB</td>
                    <td style={tdStyle}>{new Date(f.createdAt).toLocaleString('pt-BR')}</td>
                    <td style={tdStyle}>
                      <button style={btnStyle(true)} onClick={() => actDeleteFile(f)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {section === 'logs' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Data/Hora</th>
                  <th style={thStyle}>Usuário</th>
                  <th style={thStyle}>Ação</th>
                  <th style={thStyle}>Detalhe</th>
                  <th style={thStyle}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={tdStyle}>{new Date(l.at).toLocaleString('pt-BR')}</td>
                    <td style={tdStyle}>{l.username || '—'}</td>
                    <td style={tdStyle}><code>{l.action}</code></td>
                    <td style={tdStyle}>{l.detail || '—'}</td>
                    <td style={tdStyle}>{l.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
