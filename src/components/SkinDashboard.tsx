import React, { useEffect, useMemo, useState } from 'react';
import type { ToolDef } from '../types';
import vivoLogo from '../assets/logo-vivo.svg?inline';
import { applyMotionPref, readMotionPref, type MotionPref } from '../lib/motion';

export type Skin = 'bauhaus' | 'tecnico';
type Theme = 'light' | 'dark';
type Filter = 'all' | 'fav' | 'recent';
type DialogKind = 'settings' | 'about' | null;

interface UsageInfo {
  count: number;
  last: number;
}

interface Props {
  tools: ToolDef[];
  favorites: string[];
  usage: Record<string, UsageInfo>;
  isOnline: boolean;
  isAdmin: boolean;
  version: string;
  buildTime: string;
  skin: Skin;
  theme: Theme;
  onSkin: (s: Skin) => void;
  onToggleTheme: () => void;
  onOpenTool: (id: string) => void;
  onToggleFav: (id: string) => void;
  onOpenSigitm: () => void;
}

/** Descrições curtas exibidas nos cartões (as longas continuam nos tooltips/aria-label). */
const TAGLINES: Record<string, string> = {
  otdr: 'Análise de traços e eventos em arquivos .SOR.',
  topologia: 'Diagramas e arquitetura de rede.',
  tabela: 'Referência técnica para enlaces.',
  carimbo: 'Registro e identificação de fibras.',
  calculadora: 'Orçamento de potência e enlaces.',
  nsap: 'Conversão e endereçamento entre padrões.',
  datacom: 'Templates CLI para switches Datacom.',
  clientes: 'Chamados, vistorias e histórico local.',
  ta: 'Termos de atendimento e ativações.',
  rotas_hl4: 'Mapas e rotas HL4 em PNG.',
  equipamentos: 'Catálogo de ~21.600 itens de telecom.',
  kml: 'Arquivos KML e navegação no Maps.',
};

/* ---------- Arte do topo (SVG inline, sem imagens externas) ---------- */

/** Torre treliçada — usada nas duas artes. */
function Tower({ x, y, h, w }: { x: number; y: number; h: number; w: number }) {
  const rows = 9;
  const lines: React.ReactElement[] = [];
  for (let i = 0; i < rows; i++) {
    const t0 = i / rows;
    const t1 = (i + 1) / rows;
    const y0 = y + h * t0;
    const y1 = y + h * t1;
    const hw0 = (w / 2) * (0.12 + 0.88 * t0);
    const hw1 = (w / 2) * (0.12 + 0.88 * t1);
    lines.push(
      <line key={`h${i}`} x1={x - hw1} y1={y1} x2={x + hw1} y2={y1} />,
      <line key={`a${i}`} x1={x - hw0} y1={y0} x2={x + hw1} y2={y1} />,
      <line key={`b${i}`} x1={x + hw0} y1={y0} x2={x - hw1} y2={y1} />,
    );
  }
  const hwTop = (w / 2) * 0.12;
  const hwBot = w / 2;
  return (
    <g className="fx-tower">
      <line x1={x - hwTop} y1={y} x2={x - hwBot} y2={y + h} strokeWidth="3" />
      <line x1={x + hwTop} y1={y} x2={x + hwBot} y2={y + h} strokeWidth="3" />
      {lines}
      <line x1={x} y1={y - 26} x2={x} y2={y} strokeWidth="2.5" />
      {[0.1, 0.24, 0.38].map((t) => (
        <g key={t}>
          <rect x={x - 22} y={y + h * t - 7} width="9" height="22" rx="1.5" className="fx-tower-panel" />
          <rect x={x + 13} y={y + h * t - 7} width="9" height="22" rx="1.5" className="fx-tower-panel" />
        </g>
      ))}
    </g>
  );
}

function ArtBauhaus() {
  return (
    <svg className="fx-art fx-art--bauhaus" viewBox="0 0 730 292" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="730" height="292" fill="#1d2431" />
      <rect x="0" y="0" width="205" height="140" fill="#6f7886" />
      <path d="M0 292 V220 A110 110 0 0 1 110 140 H205 V292Z" fill="#1d2431" />
      <rect x="205" y="0" width="318" height="292" fill="#e6e0d2" />
      <circle cx="262" cy="190" r="128" fill="#f2b21b" />
      <rect x="523" y="106" width="207" height="186" fill="#d93a2b" />
      <path d="M730 292 V190 A110 110 0 0 0 620 292Z" fill="#1d2431" />
      <circle cx="140" cy="260" r="210" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <g stroke="#1b1f27" fill="none" strokeLinecap="round">
        <Tower x={405} y={46} h={246} w={150} />
      </g>
    </svg>
  );
}

function ArtTecnico() {
  const strands = [0, 1, 2, 3, 4, 5, 6];
  return (
    <svg className="fx-art fx-art--tecnico" viewBox="0 0 760 175" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="fxSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1a33" />
          <stop offset="0.55" stopColor="#2c4f86" />
          <stop offset="0.85" stopColor="#e58a3a" />
          <stop offset="1" stopColor="#f6b25a" />
        </linearGradient>
        <linearGradient id="fxFiber" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d3e91" />
          <stop offset="0.6" stopColor="#2f86ff" />
          <stop offset="1" stopColor="#9fd0ff" />
        </linearGradient>
        <filter id="fxGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="760" height="175" fill="url(#fxSky)" />
      <rect y="150" width="760" height="25" fill="#0a111d" opacity="0.7" />
      <g stroke="#0a0f18" fill="none" strokeLinecap="round" opacity="0.92">
        <Tower x={345} y={30} h={150} w={78} />
      </g>
      <g filter="url(#fxGlow)" fill="none" strokeLinecap="round">
        {strands.map((i) => (
          <path
            key={i}
            d={`M-10 ${40 + i * 13} C 90 ${10 + i * 22}, 180 ${150 - i * 8}, 300 ${70 + i * 8}`}
            stroke="url(#fxFiber)"
            strokeWidth={5 - i * 0.45}
            opacity={0.95 - i * 0.07}
          />
        ))}
        {[120, 190, 260, 330, 400].map((cx, i) => (
          <circle key={cx} cx={cx} cy={52 + (i % 3) * 22} r="1.8" fill="#dff0ff" />
        ))}
      </g>
    </svg>
  );
}

/* ---------- Componente principal ---------- */

function formatNow(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function SkinDashboard(props: Props) {
  const {
    tools, favorites, usage, isOnline, isAdmin, version, buildTime, skin, theme,
    onSkin, onToggleTheme, onOpenTool, onToggleFav, onOpenSigitm,
  } = props;

  const [filter, setFilter] = useState<Filter>('all');
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [now, setNow] = useState(() => new Date());
  const [motion, setMotion] = useState<MotionPref>(readMotionPref);

  const changeMotion = (m: MotionPref) => {
    setMotion(m);
    applyMotionPref(m);
  };

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDialog(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  const visible = useMemo(() => {
    if (filter === 'fav') return tools.filter((t) => favorites.includes(t.id));
    if (filter === 'recent') {
      return tools
        .filter((t) => (usage[t.id]?.count ?? 0) > 0)
        .sort((a, b) => (usage[b.id]?.last ?? 0) - (usage[a.id]?.last ?? 0));
    }
    return tools;
  }, [filter, tools, favorites, usage]);

  const navItems: { id: string; label: string; icon: string; active: boolean; onClick: () => void }[] = [
    { id: 'home', label: 'Início', icon: 'fa-table-cells-large', active: filter === 'all', onClick: () => setFilter('all') },
    { id: 'fav', label: 'Favoritos', icon: 'fa-star', active: filter === 'fav', onClick: () => setFilter('fav') },
    { id: 'recent', label: 'Histórico', icon: 'fa-clock', active: filter === 'recent', onClick: () => setFilter('recent') },
    { id: 'settings', label: 'Configurações', icon: 'fa-gear', active: false, onClick: () => setDialog('settings') },
    { id: 'about', label: 'Sobre', icon: 'fa-circle-info', active: false, onClick: () => setDialog('about') },
  ];

  const emptyMsg =
    filter === 'fav'
      ? 'Nenhuma ferramenta favorita ainda. Use a estrela em um cartão para fixá-la aqui.'
      : 'Você ainda não abriu nenhuma ferramenta neste dispositivo.';

  return (
    <div className="fx-dash">
      {/* ===== Barra lateral ===== */}
      <aside className="fx-side" aria-label="Navegação do painel">
        <div className="fx-brand">
          <i className="fas fa-signal fx-brand-icon fx-only-bauhaus" aria-hidden="true"></i>
          <i className="fas fa-tower-broadcast fx-brand-icon fx-only-tecnico" aria-hidden="true"></i>
          <span>Central de Campo</span>
        </div>

        <nav className="fx-nav">
          {navItems.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`fx-nav-item ${n.active ? 'active' : ''}`}
              aria-current={n.active ? 'page' : undefined}
              onClick={n.onClick}
            >
              <i className={`fas ${n.icon}`} aria-hidden="true"></i>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="fx-side-foot">
          <span
            className="fx-vivo"
            role="img"
            aria-label="Vivo"
            style={{ WebkitMaskImage: `url("${vivoLogo}")`, maskImage: `url("${vivoLogo}")` }}
          />
          <small className="fx-only-tecnico">Conectados<br />por um Brasil melhor</small>
        </div>
        <div className="fx-side-shapes fx-only-bauhaus" aria-hidden="true"><i></i><i></i></div>
      </aside>

      {/* ===== Conteúdo ===== */}
      <div className="fx-main">
        {/* Barra superior (estilo Técnico) */}
        <div className="fx-topbar fx-only-tecnico">
          <div className="fx-topbar-title">
            <b>Central de Campo</b>
            <small>Rede &amp; OTDR · Ferramentas de Campo</small>
          </div>
          <span className="fx-topbar-tag">Tecnologia a serviço<br />da conectividade</span>
          <div className="fx-pill">
            <span className={`fx-dot ${isOnline ? '' : 'off'}`}></span>
            {isOnline ? 'Sistema Online' : 'Modo Local'}
            <em>v{version}</em>
          </div>
        </div>

        {/* Hero */}
        <header className="fx-hero">
          <div className="fx-hero-art">
            <ArtBauhaus />
            <ArtTecnico />
          </div>
          <div className="fx-hero-copy">
            <span className="fx-flags fx-only-bauhaus" aria-hidden="true"><i></i><i></i></span>
            <h2>Painel de<br />Ferramentas de Campo</h2>
            <p>Soluções integradas para operações e diagnóstico de redes.</p>
          </div>
          <div className="fx-pill fx-only-bauhaus">
            <span className={`fx-dot ${isOnline ? '' : 'off'}`}></span>
            {isOnline ? 'Sistema Online' : 'Modo Local'}
            <em>v{version}</em>
          </div>
        </header>

        {/* Ferramentas */}
        <section aria-labelledby="fx-tools-label">
          <h3 className="fx-label" id="fx-tools-label">
            <i className="fas fa-gear fx-only-tecnico" aria-hidden="true"></i>
            <span>Ferramentas técnicas</span>
          </h3>

          {visible.length === 0 && !isAdmin ? (
            <p className="fx-empty">{emptyMsg}</p>
          ) : (
            <div className="fx-grid" role="list" aria-label="Ferramentas disponíveis">
              {visible.map((tool) => {
                const fav = favorites.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    className="fx-card"
                    data-tool={tool.id}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`${tool.name}. ${tool.desc}`}
                    title={tool.desc}
                    onClick={() => onOpenTool(tool.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenTool(tool.id);
                      }
                    }}
                  >
                    <div className="fx-card-icon">
                      <i className={`fas ${tool.icon}`} aria-hidden="true"></i>
                    </div>
                    <div className="fx-card-copy">
                      <b>{tool.short === 'OTDR' ? 'Leitor OTDR' : tool.name}</b>
                      <span>{TAGLINES[tool.id] ?? tool.desc}</span>
                    </div>
                    <button
                      type="button"
                      className={`fx-fav ${fav ? 'on' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onToggleFav(tool.id); }}
                      aria-label={fav ? `Remover ${tool.name} dos favoritos` : `Fixar ${tool.name} nos favoritos`}
                      title={fav ? 'Remover dos favoritos' : 'Fixar nos favoritos'}
                    >
                      <i className={fav ? 'fas fa-star' : 'far fa-star'}></i>
                    </button>
                    <span className="fx-go" aria-hidden="true"><i className="fas fa-arrow-right"></i></span>
                  </div>
                );
              })}
              {isAdmin && filter === 'all' && (
                <div
                  className="fx-card"
                  role="listitem"
                  tabIndex={0}
                  onClick={() => onOpenTool('admin')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenTool('admin');
                    }
                  }}
                >
                  <div className="fx-card-icon"><i className="fas fa-user-shield" aria-hidden="true"></i></div>
                  <div className="fx-card-copy">
                    <b>Painel do Administrador</b>
                    <span>Usuários, dados, arquivos e logs.</span>
                  </div>
                  <span className="fx-go" aria-hidden="true"><i className="fas fa-arrow-right"></i></span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Sistemas integrados */}
        <section aria-labelledby="fx-sys-label">
          <h3 className="fx-label fx-label--blue" id="fx-sys-label">
            <i className="fas fa-database fx-only-tecnico" aria-hidden="true"></i>
            <span>Sistemas integrados</span>
          </h3>
          <div className="fx-systems">
            <div
              className="fx-sigitm"
              role="button"
              tabIndex={0}
              aria-label="SIGITM — Sistema de Gestão de TI Vivo. Abre em janela dedicada."
              onClick={onOpenSigitm}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenSigitm();
                }
              }}
            >
              <i className="fas fa-briefcase fx-sigitm-icon" aria-hidden="true"></i>
              <div>
                <b>SIGITM</b>
                <span>Sistema de gestão de TI da Vivo</span>
              </div>
              <span className="fx-go" aria-hidden="true"><i className="fas fa-arrow-right"></i></span>
            </div>
            <div className="fx-info">
              <i className="fas fa-circle-info" aria-hidden="true"></i>
              <div>
                <b>Central de Campo</b>
                <span>Ferramentas essenciais para o técnico de campo, com acesso rápido e seguro.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Barra de status */}
        <footer className="fx-status">
          <span className="fx-status-l">
            <i className="fas fa-signal" aria-hidden="true"></i> Rede Corporativa
            <span className="fx-sep" aria-hidden="true"></span>
            Operações de Campo
          </span>
          <span className="fx-status-r">
            <span><i className="far fa-clock" aria-hidden="true"></i> {formatNow(now)}</span>
            <span className="fx-sep" aria-hidden="true"></span>
            <span className={`fx-conn ${isOnline ? '' : 'off'}`}>
              <i className={`fas ${isOnline ? 'fa-shield-halved' : 'fa-plug-circle-xmark'}`} aria-hidden="true"></i>{' '}
              {isOnline ? 'Conectado' : 'Offline'}
            </span>
          </span>
        </footer>
      </div>

      {/* ===== Diálogos (Configurações / Sobre) ===== */}
      {dialog && (
        <div className="fx-overlay" onClick={() => setDialog(null)}>
          <div className="fx-dialog" role="dialog" aria-modal="true" aria-label={dialog === 'settings' ? 'Configurações' : 'Sobre'} onClick={(e) => e.stopPropagation()}>
            {dialog === 'settings' ? (
              <>
                <h4>Aparência</h4>
                <p className="fx-dialog-sub">Estilo visual</p>
                <div className="fx-seg" role="radiogroup" aria-label="Estilo visual">
                  <button type="button" role="radio" aria-checked={skin === 'bauhaus'} className={skin === 'bauhaus' ? 'on' : ''} onClick={() => onSkin('bauhaus')}>Bauhaus</button>
                  <button type="button" role="radio" aria-checked={skin === 'tecnico'} className={skin === 'tecnico' ? 'on' : ''} onClick={() => onSkin('tecnico')}>Técnico</button>
                </div>
                <p className="fx-dialog-sub">Tema</p>
                <div className="fx-seg" role="radiogroup" aria-label="Tema">
                  <button type="button" role="radio" aria-checked={theme === 'light'} className={theme === 'light' ? 'on' : ''} onClick={() => theme !== 'light' && onToggleTheme()}>Claro</button>
                  <button type="button" role="radio" aria-checked={theme === 'dark'} className={theme === 'dark' ? 'on' : ''} onClick={() => theme !== 'dark' && onToggleTheme()}>Escuro</button>
                </div>
                <p className="fx-dialog-sub">Animações</p>
                <div className="fx-seg" role="radiogroup" aria-label="Animações">
                  <button type="button" role="radio" aria-checked={motion === 'auto'} className={motion === 'auto' ? 'on' : ''} onClick={() => changeMotion('auto')}>Normais</button>
                  <button type="button" role="radio" aria-checked={motion === 'reduced'} className={motion === 'reduced' ? 'on' : ''} onClick={() => changeMotion('reduced')}>Reduzidas</button>
                </div>
              </>
            ) : (
              <>
                <h4>Central de Campo — Rede &amp; OTDR</h4>
                <p className="fx-dialog-sub">Versão {version}</p>
                <p>Ferramentas essenciais para o técnico de campo: OTDR, carimbo de fibras, calculadora óptica, topologia e mais.</p>
                <p className="fx-dialog-sub">Build: {new Date(buildTime).toLocaleString('pt-BR')}</p>
              </>
            )}
            <button type="button" className="fx-dialog-close" onClick={() => setDialog(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
