import React, { Suspense, lazy, useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import AdminTab from './components/AdminTab';
import ErrorBoundary from './components/ErrorBoundary';
import ConfirmDialog from './components/ConfirmDialog';
import CommandPalette from './components/CommandPalette';
import * as api from './lib/api';
import type { AuthUser } from './lib/api';
import type { ToolDef } from './types';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import pkg from '../package.json';

declare const __BUILD_TIME__: string;
const APP_VERSION = (pkg as { version: string }).version;
const BUILD_TIME: string =
  typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : new Date().toISOString();

// Code splitting: cada ferramenta entra no bundle só quando é aberta.
// Leaflet, Firebase, Dexie e demais módulos pesados acompanham sua aba.
const OtdrModule = lazy(() => import('./otdr/OtdrModule'));
const CarimboTab = lazy(() => import('./components/CarimboTab'));
const CalculadoraTab = lazy(() => import('./components/CalculadoraTab'));
const TabelaTab = lazy(() => import('./components/TabelaTab'));
const NsapTab = lazy(() => import('./components/NsapTab'));
const ClientesTab = lazy(() => import('./components/ClientesTab'));
const DatacomTab = lazy(() => import('./components/DatacomTab'));
const TaTab = lazy(() => import('./components/TaTab'));
const RotasHl4Tab = lazy(() => import('./components/RotasHl4Tab'));
const EquipamentosTab = lazy(() => import('./components/EquipamentosTab'));
const KmlMapTab = lazy(() => import('./components/KmlMapTab'));
const TopologiaTab = lazy(() => import('./components/TopologiaTab'));

const TabFallback = () => (
  <div
    aria-busy="true"
    style={{
      background: 'var(--card, #eef2f7)',
      border: '1px solid var(--border, #b4bec9)',
      borderRadius: 20,
      minHeight: 320,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--muted, #5d6b80)',
      fontWeight: 600,
      fontSize: 14,
      gap: 10,
    }}
  >
    <i className="fas fa-circle-notch fa-spin" style={{ color: 'var(--accent)' }} /> Carregando ferramenta…
  </div>
);

interface UsageInfo {
  count: number;
  last: number;
}

const TOOLS: ToolDef[] = [
  {
    id: 'otdr',
    name: 'Leitor OTDR (.SOR)',
    short: 'OTDR',
    desc: 'Leitura e análise de traços OTDR em arquivos .SOR: eventos, curvas, limiares, relatórios PDF e histórico na nuvem.',
    icon: 'fa-wave-square',
    color: '#5B5FEF',
    colorRgb: '91, 95, 239',
  },
  {
    id: 'carimbo',
    name: 'Carimbo de Fibras',
    short: 'Carimbo',
    desc: 'Gerador padronizado de carimbos de fibra óptica e vistorias para ativação e registros de redes.',
    icon: 'fa-stamp',
    color: '#6366F1',
    colorRgb: '99, 102, 241',
  },
  {
    id: 'calculadora',
    name: 'Calculadora Óptica',
    short: 'Calculadora',
    desc: 'Análise completa de orçamento de potência, atenuações, margens de segurança e viabilidade física de enlaces.',
    icon: 'fa-calculator',
    color: '#F97316',
    colorRgb: '249, 115, 22',
  },
  {
    id: 'tabela',
    name: 'Tabela de Atenuação',
    short: 'Tabela',
    desc: 'Referência técnica rápida para atenuações teóricas por km e perdas típicas recomendadas para elementos de rede.',
    icon: 'fa-table',
    color: '#14B8A6',
    colorRgb: '20, 184, 166',
  },
  {
    id: 'nsap',
    name: 'Conversor NSAP',
    short: 'NSAP',
    desc: 'Conversor bidirecional avançado entre endereços NSAP e endereçamento IP estruturado para roteamento.',
    icon: 'fa-code-branch',
    color: '#06B6D4',
    colorRgb: '6, 182, 212',
  },
  {
    id: 'datacom',
    name: 'Script Datacom',
    short: 'Datacom',
    desc: 'Automatizador e gerador de templates CLI para provisionamento de VLANs, rate-limits e portas em switches Datacom.',
    icon: 'fa-terminal',
    color: '#10B981',
    colorRgb: '16, 185, 129',
  },
  {
    id: 'clientes',
    name: 'Registros de Campo',
    short: 'Registros',
    desc: 'Centralizador e gerenciador local de chamados, ordens de serviço, vistorias de equipamentos e histórico.',
    icon: 'fa-clipboard-list',
    color: '#EC4899',
    colorRgb: '236, 72, 153',
  },
  {
    id: 'ta',
    name: 'Controle de TA',
    short: 'TA',
    desc: 'Gerenciador de termos de atendimento, definições de enlace, ativações de campo e uso de sobressalentes.',
    icon: 'fa-file-signature',
    color: '#8B5CF6',
    colorRgb: '139, 92, 246',
  },
  {
    id: 'rotas_hl4',
    name: 'Rotas HL4',
    short: 'Rotas HL4',
    desc: 'Gerenciamento e visualização de mapas e rotas HL4 em formato PNG.',
    icon: 'fa-map-marked-alt',
    color: '#3B82F6',
    colorRgb: '59, 130, 246',
  },
  {
    id: 'equipamentos',
    name: 'Consulta de Equipamentos',
    short: 'Equipamentos',
    desc: 'Catálogo IndexedDB de ~21.600 itens de telecom, busca por código/ref/descrição e filtros.',
    icon: 'fa-boxes',
    color: '#059669',
    colorRgb: '5, 150, 105',
  },
  {
    id: 'kml',
    name: 'Mapa KML & Navegação Maps',
    short: 'Mapa KML',
    desc: 'Envio de arquivos .KML, visualização de pontos geográficos no mapa e rota de navegação direta para o App Google Maps.',
    icon: 'fa-map-marked-alt',
    color: '#10b981',
    colorRgb: '16, 185, 129',
  },
  {
    id: 'topologia',
    name: 'Mapa de Topologia',
    short: 'Topologia',
    desc: 'Gerador automático de diagramas de topologia de rede (SVG/PNG/PDF) com rotas, equipamentos e caixas de informação.',
    icon: 'fa-diagram-project',
    color: '#7C3AED',
    colorRgb: '124, 58, 237',
  },
];

const VALID_TABS = ['dashboard', ...TOOLS.map((t) => t.id), 'admin'];

/**
 * Linha "viva" do painel: atalho para continuar de onde parou
 * + métricas locais (traços OTDR salvos neste dispositivo e registros de campo).
 */

/** Helpers de leitura segura do localStorage (dados locais do painel) */
function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

const readUsage = (): Record<string, UsageInfo> => {
  const u = readLocalJson<Record<string, UsageInfo>>('toolUsage', {});
  const clean: Record<string, UsageInfo> = {};
  for (const t of TOOLS) {
    if (u[t.id] && typeof u[t.id].count === 'number') clean[t.id] = u[t.id];
  }
  return clean;
};

const readFavorites = (): string[] => {
  const f = readLocalJson<unknown>('favTools', []);
  return Array.isArray(f) ? f.filter((x): x is string => typeof x === 'string' && VALID_TABS.includes(x)) : [];
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSkeuo, setIsSkeuo] = useState<boolean>(true);
  const isOnline = useOnlineStatus();

  // Painel vivo: uso por ferramenta + favoritos + paleta de comandos + dialog de confirmação
  const [usage, setUsage] = useState<Record<string, UsageInfo>>(readUsage);
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Conta autenticada no backend próprio (sessão por cookie HttpOnly)
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [localMode, setLocalMode] = useState(false);

  // Verifica sessão existente no servidor ao abrir o app
  useEffect(() => {
    api
      .fetchMe()
      .then((me) => {
        setUser(me);
        setLocalMode(false);
      })
      .catch(() => {
        // Servidor indisponível → Modo Local (ferramentas funcionam sem nuvem)
        setUser(null);
        setLocalMode(true);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // Logout global (backend invalida a sessão)
  const handleAccountLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* segue o logout local mesmo se o servidor falhar */
    }
    setUser(null);
    setActiveTab('dashboard');
    localStorage.setItem('lastActiveTab', 'dashboard');
    showToast('Sessão encerrada.', 'info');
  };

  // Custom Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  // Initialize and apply theme, finish mode, dashboard layout and active tab
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    const savedSkeuo = localStorage.getItem('skSkin') !== 'false';
    setIsSkeuo(savedSkeuo);
    document.documentElement.classList.toggle('sk-skin', savedSkeuo);

    const hashTab = window.location.hash.replace('#', '');
    const initialTab = VALID_TABS.includes(hashTab)
      ? hashTab
      : (localStorage.getItem('lastActiveTab') || 'dashboard');

    setActiveTab(initialTab);
    window.history.replaceState({ tab: initialTab }, '', '#' + initialTab);

    // Native back button / gesture listener for mobile and tablets
    const handlePopState = (event: PopStateEvent) => {
      const stateTab = event.state?.tab;
      const currentHash = window.location.hash.replace('#', '');
      const targetTab = (stateTab && VALID_TABS.includes(stateTab))
        ? stateTab
        : (VALID_TABS.includes(currentHash) ? currentHash : 'dashboard');

      setActiveTab(targetTab);
      localStorage.setItem('lastActiveTab', targetTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Update theme and persist
  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showToast(`Tema alterado para ${newTheme === 'dark' ? 'escuro' : 'claro'}`, 'success');
  };

  // Toggle skeuomorphic finish (Acabamento Realista)
  const handleToggleSkeuo = () => {
    const nextVal = !isSkeuo;
    setIsSkeuo(nextVal);
    localStorage.setItem('skSkin', String(nextVal));
    document.documentElement.classList.toggle('sk-skin', nextVal);
    if (nextVal) {
      showToast('Acabamento realista (skeuomorfismo) ativado!', 'success');
    } else {
      showToast('Acabamento realista desativado (modo plano).', 'info');
    }
  };

  // Update active tab, persist and push to native history for device back navigation
  const handleTabChange = (tabId: string, pushToHistory: boolean = true) => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    localStorage.setItem('lastActiveTab', tabId);
    if (pushToHistory) {
      window.history.pushState({ tab: tabId }, '', '#' + tabId);
    }
    // Contadores de uso (ferramentas reais) → ordenação "mais usadas" do painel
    if (VALID_TABS.includes(tabId) && tabId !== 'dashboard' && tabId !== 'admin') {
      setUsage((prev) => {
        const next = { ...prev, [tabId]: { count: (prev[tabId]?.count || 0) + 1, last: Date.now() } };
        localStorage.setItem('toolUsage', JSON.stringify(next));
        return next;
      });
    }
  };

  // Favoritar/desfavoritar ferramenta (pino fixado no topo do painel)
  const toggleFavorite = (toolId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId];
      localStorage.setItem('favTools', JSON.stringify(next));
      showToast(
        next.includes(toolId)
          ? `“${TOOLS.find((t) => t.id === toolId)?.short}” fixado nas primeiras posições.`
          : `“${TOOLS.find((t) => t.id === toolId)?.short}” desafixado.`,
        'info'
      );
      return next;
    });
  };

  // Atalho global: Ctrl/Cmd + K abre a busca global
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Ordem do painel: favoritos primeiro, depois mais usados, depois ordem padrão
  const orderedTools = [...TOOLS].sort((a, b) => {
    const fa = favorites.includes(a.id) ? 0 : 1;
    const fb = favorites.includes(b.id) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    const ca = usage[a.id]?.count ?? 0;
    const cb = usage[b.id]?.count ?? 0;
    if (ca !== cb) return cb - ca;
    return TOOLS.indexOf(a) - TOOLS.indexOf(b);
  });

  // Native back handler for back-to-dashboard button
  const handleBackNavigation = () => {
    if (window.history.state && window.history.length > 1) {
      window.history.back();
    } else {
      handleTabChange('dashboard');
    }
  };

  // Get localized tool name for breadcrumb
  const getTabName = (tabId: string) => {
    if (tabId === 'otdr') return 'Leitor OTDR (.SOR)';
    if (tabId === 'admin') return 'Painel do Administrador';
    const tool = TOOLS.find((t) => t.id === tabId);
    return tool ? tool.name : '';
  };

  // Toast Dispatcher
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
  };

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Global actions
  const handleResetAll = () => {
    setConfirmResetOpen(true);
  };

  const doResetAll = () => {
    setConfirmResetOpen(false);
    localStorage.clear();
    showToast('Todas as configurações e registros locais foram resetados.', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleExportAll = () => {
    const dbRecords = localStorage.getItem('clientesEquipamentosDB');
    const calcConfig = localStorage.getItem('calcConfig');

    const allData = {
      clientesEquipamentos: dbRecords ? JSON.parse(dbRecords) : [],
      calculadoraConfig: calcConfig ? JSON.parse(calcConfig) : null,
      theme: theme,
      acabamentoRealista: isSkeuo,
      exportDate: new Date().toISOString(),
      version: '4.0',
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_central_campo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Backup completo do sistema exportado!', 'success');
  };

  const toastIcon = (type: string) =>
    type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';

  // Gate de autenticação: sessão só validada no servidor
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#5a6c8c' }}>Verificando sessão...</span>
      </div>
    );
  }

  if (!user && !localMode) {
    return <AuthScreen onAuthed={setUser} onBack={() => setLocalMode(true)} />;
  }

  return (
    <div className={`app-container page-shell ${activeTab === 'kml' ? 'kml-mode-active' : ''}`}>
      <div className="app-content">
        {/* Header */}
        <div className="app-header">
          <div className="app-title">
            <i className="fas fa-network-wired"></i> Central de Campo — Rede &amp; OTDR
            <div className="version-badge">v{APP_VERSION}</div>
          </div>

          {/* Controls Bar */}
          <div className="controls-bar">
            {/* Breadcrumb na mesma linha da barra de controles (tudo alinhado horizontalmente) */}
            {activeTab !== 'dashboard' && (
              <div className="back-inline">
                <button className="back-to-dashboard-btn" onClick={handleBackNavigation}>
                  <i className="fas fa-arrow-left"></i> Voltar ao Painel
                </button>
                <span className="crumb-sep"><i className="fas fa-chevron-right"></i></span>
                <span className="crumb-name">{getTabName(activeTab)}</span>
              </div>
            )}
            <button
              className="theme-toggle"
              onClick={() => setPaletteOpen(true)}
              title="Busca global (Ctrl+K)"
              aria-label="Abrir busca global"
            >
              <i className="fas fa-magnifying-glass"></i>
            </button>
            <button className="theme-toggle" onClick={handleToggleTheme} aria-label="Alternar tema claro/escuro">
              <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}></i>
            </button>
            <button
              className={`sk-skin-toggle-btn ${isSkeuo ? 'active' : ''}`}
              onClick={handleToggleSkeuo}
              title="Alternar acabamento em vidro (neumorfismo + glassmorphism)"
            >
              <i className="fas fa-layer-group"></i> {isSkeuo ? 'Glass ON' : 'Glass'}
            </button>
            <button className="export-btn" onClick={handleExportAll} aria-label="Exportar todos os dados">
              <i className="fas fa-file-export"></i> Exportar
            </button>
            <button className="reset-btn" onClick={handleResetAll} aria-label="Resetar todas as ferramentas">
              <i className="fas fa-redo"></i> Resetar
            </button>

            {/* Conta autenticada (ou Modo Local sem servidor) */}
            {user ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '2px 6px 2px 10px',
                  borderRadius: '12px',
                  border: '1px solid var(--border, rgba(90,105,135,0.3))',
                  background: 'var(--panel, rgba(255,255,255,0.5))',
                }}
              >
                <i className={user.role === 'admin' ? 'fas fa-user-shield' : 'fas fa-user-circle'} style={{ color: 'var(--accent, #2f5fdb)' }}></i>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>
                  {user.name || user.username}
                  {user.role === 'admin' && <span style={{ fontSize: '10px', opacity: 0.7 }}> · admin</span>}
                </span>
                <button
                  onClick={handleAccountLogout}
                  title="Encerrar sessão"
                  aria-label="Sair"
                  style={{
                    border: '1px solid rgba(200,60,60,0.4)',
                    background: 'rgba(200,60,60,0.08)',
                    color: '#a32626',
                    borderRadius: '9px',
                    padding: '2px 6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Sair
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '2px 6px 2px 10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(249,152,31,0.5)',
                  background: 'rgba(249,152,31,0.10)',
                }}
                title="Sem conexão com o servidor: histórico e dados ficam neste dispositivo. A sincronização volta quando o servidor estiver no ar."
              >
                <i className="fas fa-plug" style={{ color: '#f97316' }}></i>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>Modo Local (sem servidor)</span>
                <button
                  onClick={() => setLocalMode(false)}
                  title="Tentar acessar o servidor"
                  style={{
                    border: '1px solid rgba(47,111,219,0.4)',
                    background: 'rgba(47,111,219,0.10)',
                    color: 'var(--accent, #2f5fdb)',
                    borderRadius: '9px',
                    padding: '2px 6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Entrar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        {activeTab === 'dashboard' ? (
          <div className="dashboard-container">
            <div className="dashboard-intro">
              <h2>Painel de Ferramentas de Campo</h2>
              <p>Selecione um dos utilitários integrados para iniciar suas operações e gerenciar as atividades de campo.</p>
            </div>

            <div className="metro-group-label">ferramentas</div>

            <div className="dashboard-grid" role="list" aria-label="Ferramentas disponíveis">
              {orderedTools.map((tool) => (
                <div
                  key={tool.id}
                  className="dashboard-card"
                  style={{ '--tool-color': tool.color, '--tool-color-rgb': tool.colorRgb } as React.CSSProperties}
                  onClick={() => handleTabChange(tool.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTabChange(tool.id); } }}
                  role="listitem"
                  aria-label={`${tool.name}. ${tool.desc}`}
                  tabIndex={0}
                >
                  <div className="dashboard-card-glow"></div>
                  <div className="dashboard-card-top">
                    <div className="dashboard-card-header">
                      <div className="dashboard-card-icon">
                        <i className={`fas ${tool.icon}`}></i>
                      </div>
                      <button
                        className="dash-fav-btn"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(tool.id); }}
                        title={favorites.includes(tool.id) ? 'Remover dos favoritos' : 'Fixar nas primeiras posições'}
                        aria-label={favorites.includes(tool.id) ? `Remover ${tool.name} dos favoritos` : `Fixar ${tool.name} nos favoritos`}
                      >
                        <i className={favorites.includes(tool.id) ? 'fas fa-star' : 'far fa-star'}></i>
                      </button>
                    </div>
                    <div className="dashboard-card-title">{tool.name}</div>
                    <div className="dashboard-card-desc">{tool.desc}</div>
                    {(favorites.includes(tool.id) || (usage[tool.id]?.count ?? 0) > 0) && (
                      <div className="dash-fav-meta">
                        {favorites.includes(tool.id) && <span><i className="fas fa-star"></i> Fixada</span>}
                        {(usage[tool.id]?.count ?? 0) > 0 && <span><i className="fas fa-clock-rotate-left"></i> {usage[tool.id].count} uso(s)</span>}
                      </div>
                    )}
                  </div>
                  <div className="dashboard-card-footer">
                    Acessar <i className="fas fa-arrow-right"></i>
                  </div>
                </div>
              ))}

              {user?.role === 'admin' && (
                <div
                  className="dashboard-card"
                  style={{ '--tool-color': '#b91c1c', '--tool-color-rgb': '185, 28, 28' } as React.CSSProperties}
                  onClick={() => handleTabChange('admin')}
                >
                  <div className="dashboard-card-glow"></div>
                  <div className="dashboard-card-top">
                    <div className="dashboard-card-header">
                      <div className="dashboard-card-icon">
                        <i className="fas fa-user-shield"></i>
                      </div>
                    </div>
                    <div className="dashboard-card-title">Painel do Administrador</div>
                    <div className="dashboard-card-desc">
                      Gestão de usuários, dados, arquivos e logs de atividade — exclusivo para admin.
                    </div>
                  </div>
                  <div className="dashboard-card-footer">
                    Acessar <i className="fas fa-arrow-right"></i>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Active Panel View */}
            <div className="tab-panels">
              <Suspense fallback={<TabFallback />}>
                <ErrorBoundary toolName={getTabName(activeTab) || 'Ferramenta'}>
                  {activeTab === 'otdr' && <OtdrModule user={user} />}
                  {activeTab === 'carimbo' && <CarimboTab showToast={showToast} />}
                  {activeTab === 'calculadora' && <CalculadoraTab showToast={showToast} />}
                  {activeTab === 'tabela' && <TabelaTab />}
                  {activeTab === 'nsap' && <NsapTab showToast={showToast} />}
                  {activeTab === 'datacom' && <DatacomTab showToast={showToast} />}
                  {activeTab === 'clientes' && <ClientesTab showToast={showToast} />}
                  {activeTab === 'ta' && <TaTab showToast={showToast} />}
                  {activeTab === 'rotas_hl4' && <RotasHl4Tab showToast={showToast} />}
                  {activeTab === 'equipamentos' && <EquipamentosTab showToast={showToast} />}
                  {activeTab === 'kml' && <KmlMapTab showToast={showToast} />}
                  {activeTab === 'topologia' && <TopologiaTab showToast={showToast} />}
                  {activeTab === 'admin' && user?.role === 'admin' && <AdminTab showToast={showToast} />}
                </ErrorBoundary>
              </Suspense>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="app-footer">
          <p>
            <span className={`sk-led ${isOnline ? '' : 'off'}`}></span>
            Central de Campo — Rede &amp; OTDR v{APP_VERSION} by Tony Campos
            <span style={{ opacity: 0.65 }}>|</span> {isOnline ? 'Online' : 'Offline — modo local ativo'}
            <span style={{ opacity: 0.65 }}>|</span> Build: {new Date(BUILD_TIME).toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
      {/* ===== fim do conteúdo ===== */}

      {/* Paleta de comandos (Ctrl+K) */}
      <CommandPalette
        open={paletteOpen}
        tools={TOOLS}
        extras={
          user?.role === 'admin'
            ? [{ id: 'admin', name: 'Painel do Administrador', icon: 'fa-user-shield' }]
            : []
        }
        onClose={() => setPaletteOpen(false)}
        onGo={handleTabChange}
      />

      {/* Confirmação centralizada (substitui confirm() nativo) */}
      <ConfirmDialog
        open={confirmResetOpen}
        danger
        title="Resetar todas as ferramentas?"
        message="Isso apaga configurações, favoritos e todo o histórico local do dispositivo (os dados já salvos na nuvem, quando logado, permanecem no servidor). Esta ação não pode ser desfeita."
        confirmLabel="Resetar tudo"
        onConfirm={doResetAll}
        onCancel={() => setConfirmResetOpen(false)}
      />

      {/* Toast Notification element */}
      {toast && (
        <div className={`sk-toast sk-toast--${toast.type}`}>
          <i className={`fas ${toastIcon(toast.type)}`}></i>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
