/**
 * AuthScreen.tsx — tela de login/cadastro com usuário e senha.
 * Substitui o login Google/Firebase: contas ficam no backend próprio
 * (bcrypt, sessão HttpOnly, bloqueio por força bruta no servidor).
 */
import React, { useEffect, useState } from 'react';
import * as api from '../lib/api';

interface Props {
  onAuthed: (user: api.AuthUser) => void;
  /** Opcional: mostra um link para voltar ao Modo Local (sem servidor) */
  onBack?: () => void;
}

type Mode = 'login' | 'register';

export default function AuthScreen({ onAuthed, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Foco no primeiro campo ao abrir / trocar de modo
  useEffect(() => {
    const el = document.getElementById('auth-username');
    el?.focus();
  }, [mode]);

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setError(null);
    setErrorHint(null);
    setPassword('');
    setConfirm('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorHint(null);
    const uname = username.trim();

    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,31}$/.test(uname)) {
      setError('Nome de usuário inválido.');
      setErrorHint('Use 3–32 caracteres: letras, números, ponto, underline ou hífen (ex.: antonio.silva, 80654158).');
      return;
    }
    if (password.length < 8) {
      setError('A senha está curta.');
      setErrorHint('A senha precisa ter no mínimo 8 caracteres.');
      return;
    }
    if (mode === 'register' && password !== confirm) {
      setError('As senhas não conferem.');
      setErrorHint('A confirmação deve ser exatamente igual à senha. Confira se o Caps Lock não está ativo.');
      return;
    }

    setBusy(true);
    try {
      const user =
        mode === 'login'
          ? await api.login(uname, password)
          : await api.register(uname, password, name.trim() || null);
      onAuthed(user);
    } catch (err: any) {
      setBusy(false);
      const msg = err?.message || 'Erro de conexão com o servidor.';
      if (mode === 'register') {
        if (err?.status === 409 || /já está em uso/i.test(msg)) {
          setError('Este nome de usuário já está registrado.');
          setErrorHint('Se a conta é sua, volte para "Já tenho conta" e digite a senha dela. Esqueceu a senha? O administrador pode redefini-la.');
        } else if (/conex/i.test(msg) || err?.status === 500) {
          setError('Não consegui falar com o servidor.');
          setErrorHint('Verifique se o aplicativo do servidor (backend) está em execução e tente novamente.');
          return; // mantém os campos para não perder a digitação
        } else {
          setError(msg);
          setErrorHint('Ajuste os dados e tente de novo.');
        }
        return; // no cadastro, mantém os campos
      }
      // login
      if (err?.status === 401) {
        setError('Usuário ou senha incorretos.');
        setErrorHint('Confira os dados — se você ainda não criou uma conta, use a aba "Criar conta" acima. Esqueceu a senha? O administrador pode redefini-la.');
      } else if (err?.status === 429) {
        setError(msg);
        setErrorHint('Houve muitas tentativas seguidas. Espere alguns minutos para tentar de novo.');
      } else if (/conex/i.test(msg) || err?.status === 500) {
        setError('Não consegui falar com o servidor.');
        setErrorHint('Verifique se o aplicativo do servidor (backend) está em execução e tente novamente.');
      } else {
        setError(msg);
      }
      return; // mantém os campos digitados
    }
  };

  const inputStyle = (filled: boolean): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(90,105,135,0.35)',
    fontSize: '15px',
    fontFamily: 'inherit',
    background: filled ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.55)',
    color: '#20304c',
    outline: 'none',
  });

  const labelStyle: React.CSSProperties = {
    display: 'block',
    margin: '0 0 6px 2px',
    fontSize: '12.5px',
    fontWeight: 800,
    letterSpacing: '0.01em',
    color: '#3c4f6e',
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, #dfe6ef 0%, #cbd6e4 45%, #b8c6d8 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: 'linear-gradient(180deg, #f4f6fb, #e6ebf3)',
          border: '1px solid rgba(90,105,135,0.35)',
          borderRadius: '20px',
          boxShadow: '0 22px 55px rgba(15,25,45,0.28), inset 0 1px 0 rgba(255,255,255,0.85)',
          padding: '24px 24px 18px',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              margin: '0 auto 10px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(160deg, #5b8def, #2f5fdb)',
              color: '#fff',
              fontSize: '24px',
              boxShadow: '0 4px 10px rgba(47,111,219,0.4), inset 0 1px 0 rgba(255,255,255,0.35)',
            }}
          >
            <i className="fas fa-network-wired"></i>
          </div>
          <h1 style={{ margin: 0, fontSize: '19px', color: '#20304c' }}>Central de Campo</h1>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#5a6c8c' }}>
            Rede &amp; OTDR · v4.0
          </p>
        </div>

        {/* Seletor: já tenho conta / criar conta */}
        <div
          style={{
            display: 'flex',
            marginBottom: '16px',
            border: '1px solid rgba(90,105,135,0.35)',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.45)',
          }}
          role="tablist"
        >
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{
              flex: 1,
              padding: '9px 0',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: mode === 'login' ? 'linear-gradient(160deg, #5b8def, #2f5fdb)' : 'transparent',
              color: mode === 'login' ? '#fff' : '#46577a',
            }}
          >
            Já tenho conta
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            style={{
              flex: 1,
              padding: '9px 0',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              borderLeft: '1px solid rgba(90,105,135,0.25)',
              cursor: 'pointer',
              background: mode === 'register' ? 'linear-gradient(160deg, #16a34a, #15803d)' : 'transparent',
              color: mode === 'register' ? '#fff' : '#46577a',
            }}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }} noValidate>
          {/* Usuário */}
          <div>
            <label htmlFor="auth-username" style={labelStyle}>
              Usuário
            </label>
            <input
              id="auth-username"
              type="text"
              placeholder="ex.: antonio.silva ou 80654158"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle(!!username)}
              disabled={busy}
            />
            {mode === 'register' && (
              <div style={{ margin: '5px 0 0 2px', fontSize: '11.5px', color: '#7182a2' }}>
                3–32 caracteres · letras, números, . _ -
              </div>
            )}
          </div>

          {/* Nome (apenas cadastro) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" style={labelStyle}>
                Seu nome <span style={{ fontWeight: 600, opacity: 0.7 }}>(opcional)</span>
              </label>
              <input
                id="auth-name"
                type="text"
                placeholder="ex.: Antonio Silva"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle(!!name)}
                disabled={busy}
              />
            </div>
          )}

          {/* Senha */}
          <div>
            <label htmlFor="auth-password" style={labelStyle}>
              {mode === 'register' ? 'Senha (mínimo 8 caracteres)' : 'Senha'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-password"
                type={showPw ? 'text' : 'password'}
                placeholder="digite sua senha"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle(!!password), paddingRight: '40px' }}
                disabled={busy}
              />
              <button
                type="button"
                aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#7182a2',
                  cursor: 'pointer',
                  padding: '6px',
                }}
                tabIndex={-1}
              >
                <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Confirmar senha (apenas cadastro) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-confirm" style={labelStyle}>
                Repita a senha
              </label>
              <input
                id="auth-confirm"
                type={showPw ? 'text' : 'password'}
                placeholder="digite a mesma senha de novo"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={inputStyle(!!confirm)}
                disabled={busy}
              />
              <div style={{ margin: '5px 0 0 2px', fontSize: '11.5px', color: '#7182a2' }}>
                Digite a mesma senha novamente para evitar erro de digitação.
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div
              style={{
                background: 'rgba(220,60,60,0.10)',
                border: '1px solid rgba(220,60,60,0.4)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '13px',
              }}
            >
              <div style={{ color: '#a32626', fontWeight: 700 }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                {error}
              </div>
              {errorHint && (
                <div style={{ marginTop: '3px', color: '#7a4a4a', fontSize: '12px' }}>{errorHint}</div>
              )}
            </div>
          )}

          {/* Ação principal — rótulo único por modo */}
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '12px 0',
              fontSize: '15px',
              fontWeight: 800,
              border: '1px solid rgba(90,105,135,0.4)',
              borderRadius: '12px',
              cursor: busy ? 'wait' : 'pointer',
              background:
                mode === 'login'
                  ? 'linear-gradient(160deg, #5b8def, #2f5fdb)'
                  : 'linear-gradient(160deg, #22c55e, #16a34a)',
              color: '#fff',
              boxShadow: '0 4px 10px rgba(47,111,219,0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? (
              <>
                <i className="fas fa-spinner" style={{ marginRight: '8px' }}></i>
                Verificando...
              </>
            ) : mode === 'login' ? (
              'Entrar com minha conta'
            ) : (
              'Criar minha conta e entrar'
            )}
          </button>
        </form>

        {/* Rodapé */}
        <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: '#7182a2', textAlign: 'center' }}>
          Esqueceu a senha? O <strong>administrador</strong> pode redefini-la pelo painel.
          <br />
          Sua senha é guardada como hash no servidor — nunca em texto.
        </p>
        {onBack && (
          <p style={{ margin: '16px 0 0', textAlign: 'center' }}>
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#2f5fdb',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'inherit',
                textDecoration: 'underline',
              }}
            >
              ← Continuar sem conta (Modo Local)
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
