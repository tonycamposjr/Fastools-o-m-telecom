import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ROTAS_MAPA } from './mapaDados';

/**
 * Aba "Mapa Interativo" das Rotas HL4.
 *
 * Reproduz 1:1 (geometria + textos) as 5 topologias dos PDFs
 * "I-BR-SP-*-HL4-01 TOPOLOGIA FLUXOGRAMA" (dados em mapaDados.ts).
 * Interatividade: abas por rota, zoom (scroll/botões), pan (arrastar),
 * tooltip + destaque de enlaces ao passar/clicar em um nó.
 */

const FONTE = 'Arial, Helvetica, sans-serif';
const COR_HIGHLIGHT = '#e11d48';

interface PontoTooltip {
  x: number;
  y: number;
}

export default function RotasHl4MapaTab() {
  const [routeIdx, setRouteIdx] = useState(0);
  const rota = ROTAS_MAPA[routeIdx];

  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 });

  const [view, setView] = useState({ s: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<PontoTooltip | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ px: number; py: number; tx: number; ty: number; moved: boolean } | null>(null);

  // Ajusta a rota ao container (fit inicial / troca de rota / resize)
  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (!cw || !ch) return;
    const pad = 28;
    const s = Math.min((cw - pad) / rota.w, (ch - pad) / rota.h);
    setView({
      s,
      tx: (cw - rota.w * s) / 2,
      ty: (ch - rota.h * s) / 2,
    });
  }, [rota.w, rota.h]);

  useEffect(() => {
    setHover(null);
    setPinned(null);
    if (wrapSize.w && wrapSize.h) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeIdx, wrapSize.w, wrapSize.h]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setWrapSize({ w: el.clientWidth, h: el.clientHeight });
    });
    obs.observe(el);
    setWrapSize({ w: el.clientWidth, h: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  // ESC solta o pin
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.ctrlKey) setPinned(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Zoom por scroll (precisa de listener não-passivo)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { s, tx, ty } = viewRef.current;
      const fator = Math.exp(-e.deltaY * 0.0016);
      const nova = Math.min(6, Math.max(0.08, s * fator));
      const k = nova / s;
      setView({
        s: nova,
        tx: mx - (mx - tx) * k,
        ty: my - (my - ty) * k,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomPor = (fator: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const cw = el.clientWidth / 2;
    const ch = el.clientHeight / 2;
    const { s, tx, ty } = viewRef.current;
    const nova = Math.min(6, Math.max(0.08, s * fator));
    const k = nova / s;
    setView({ s: nova, tx: cw - (cw - tx) * k, ty: ch - (ch - ty) * k });
  };

  const ativo = pinned ?? hover;
  const noAtivo = ativo != null ? rota.nodes[ativo] : null;

  // Enlaces que tocam o nó em destaque (ponta dentro da caixa inflada)
  const destacar = useMemo(() => {
    if (ativo == null) return null;
    const r = rota.nodes[ativo].caixa;
    const infl = { x0: r.x - 8, y0: r.y - 8, x1: r.x + r.w + 8, y1: r.y + r.h + 8 };
    const dentro = (x: number, y: number) =>
      x >= infl.x0 && x <= infl.x1 && y >= infl.y0 && y <= infl.y1;
    const linhas = rota.linhas.map((ln) => dentro(ln[0], ln[1]) || dentro(ln[2], ln[3]));
    const vermelhas = rota.vermelhas.map((ln: number[]) => dentro(ln[0], ln[1]) || dentro(ln[2], ln[3]));
    return { linhas, vermelhas };
  }, [ativo, rota]);

  // --- handlers de pan / clique ---
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = wrapRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true;
    if (d.moved) {
      setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (d && !d.moved) {
      // clique simples: fixa/_remove o pin do nó sob o cursor
      setPinned((cur) => (hover != null ? (cur === hover ? null : hover) : null));
    }
  };

  // posição do tooltip (limitada ao container)
  const tipStyle: React.CSSProperties = useMemo(() => {
    if (!tipPos || wrapSize.w === 0) return { display: 'none' };
    const tw = 260;
    const x = Math.min(Math.max(8, tipPos.x + 18), Math.max(8, wrapSize.w - tw - 10));
    const y = Math.min(Math.max(8, tipPos.y + 18), Math.max(8, wrapSize.h - 96));
    return { display: 'block', left: x, top: y };
  }, [tipPos, wrapSize]);

  return (
    <div>
      {/* Abas das rotas */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '14px',
          alignItems: 'center',
        }}
      >
        {ROTAS_MAPA.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setRouteIdx(i)}
            style={{
              background: i === routeIdx ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: i === routeIdx ? '1px solid rgba(129,140,248,0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: i === routeIdx ? 700 : 500,
              cursor: 'pointer',
              letterSpacing: '0.2px',
              boxShadow: i === routeIdx ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none',
            }}
            title={r.titulo.replace(/  +/g, ' ')}
          >
            <i className="fas fa-project-diagram" style={{ marginRight: 7, opacity: 0.9 }}></i>
            {r.titulo.replace(/  +/g, ' ')}
          </button>
        ))}
      </div>

      {/* Barra de controles de zoom */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => zoomPor(1 / 1.25)}
            style={botaoCtrl}
            title="Reduzir zoom"
          >
            <i className="fas fa-minus"></i>
          </button>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#a5b4fc',
              minWidth: '52px',
              textAlign: 'center',
              background: 'rgba(99, 102, 241, 0.15)',
              padding: '5px 8px',
              borderRadius: '8px',
            }}
          >
            {Math.round(view.s * 100)}%
          </span>
          <button onClick={() => zoomPor(1.25)} style={botaoCtrl} title="Ampliar zoom">
            <i className="fas fa-plus"></i>
          </button>
        </div>
        <button onClick={fit} style={{ ...botaoCtrl, gap: 6, paddingLeft: 12, paddingRight: 12 }} title="Enquadrar no painel">
          <i className="fas fa-expand"></i> Ajustar
        </button>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Scroll = zoom · Arraste = mover · Clique no nó = fixar info · Ctrl/ESC = soltar
        </span>
      </div>

      {/* Painel do mapa */}
      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          setHover(null);
          setTipPos(null);
        }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          height: '68vh',
          minHeight: '440px',
          background: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          cursor: dragging ? 'grabbing' : noAtivo != null ? 'pointer' : 'grab',
          boxShadow: '0 14px 40px rgba(0, 0, 0, 0.35)',
          touchAction: 'none',
        }}
      >
        <svg
          key={rota.id}
          xmlns="http://www.w3.org/2000/svg"
          width={rota.w}
          height={rota.h}
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`,
            transformOrigin: '0 0',
            display: 'block',
            userSelect: 'none',
          }}
        >
          <defs>
            <radialGradient id="mapaGradNo" cx="50%" cy="42%" r="75%">
              <stop offset="0%" stopColor="#f1edf9" />
              <stop offset="55%" stopColor="#e2daf3" />
              <stop offset="100%" stopColor="#b3a0dc" />
            </radialGradient>
            <radialGradient id="mapaGradVerde" cx="50%" cy="40%" r="78%">
              <stop offset="0%" stopColor="#eef7e4" />
              <stop offset="55%" stopColor="#d8ecc8" />
              <stop offset="100%" stopColor="#93bd80" />
            </radialGradient>
            <linearGradient id="mapaGradPainel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fcfcfb" />
              <stop offset="100%" stopColor="#a9a5a1" />
            </linearGradient>
          </defs>

          {/* fundo */}
          <rect x={0} y={0} width={rota.w} height={rota.h} fill="#ffffff" />

          {/* Painéis cinza (títulos/ifaces/detalhes) */}
          {rota.paineis.map((p, pi) => (
            <g key={`painel-${pi}`}>
              <rect
                x={p.outer.x}
                y={p.outer.y}
                width={p.outer.w}
                height={p.outer.h}
                fill="url(#mapaGradPainel)"
                stroke="#141414"
                strokeWidth={0.9}
              />
              <rect
                x={p.inner.x}
                y={p.inner.y}
                width={p.inner.w}
                height={p.inner.h}
                fill="none"
                stroke="#141414"
                strokeWidth={0.85}
              />
              {p.linhas.map((l, li) => (
                <text
                  key={li}
                  x={l.x0}
                  y={l.baseY}
                  textAnchor="start"
                  fontFamily={FONTE}
                  fontSize={l.size}
                  fontWeight={l.bold ? 700 : 400}
                  fontStyle={l.italic ? 'italic' : 'normal'}
                  fill={l.red ? '#ff0000' : '#000000'}
                  style={{ pointerEvents: 'none' }}
                >
                  {l.t}
                </text>
              ))}
            </g>
          ))}

          {/* Enlaces */}
          {rota.linhas.map((ln, i) => {
            const hl = destacar?.linhas[i];
            return (
              <line
                key={`ln-${i}`}
                x1={ln[0]}
                y1={ln[1]}
                x2={ln[2]}
                y2={ln[3]}
                stroke={hl ? COR_HIGHLIGHT : '#000000'}
                strokeWidth={hl ? Math.max(ln[4] * 1.8, 1.6) : Math.max(ln[4], 0.75)}
              />
            );
          })}

          {/* Linha vermelha (ex.: Raman) */}
          {rota.vermelhas.map((ln, i) => {
            const hl = destacar?.vermelhas[i];
            return (
              <line
                key={`rv-${i}`}
                x1={ln[0]}
                y1={ln[1]}
                x2={ln[2]}
                y2={ln[3]}
                stroke={hl ? COR_HIGHLIGHT : '#ff0000'}
                strokeWidth={0.9}
              />
            );
          })}

          {/* Setas */}
          {rota.setas.map((a, i) => (
            <polygon
              key={`ar-${i}`}
              points={a.pts.map((pt) => pt.join(',')).join(' ')}
              fill={a.cor}
            />
          ))}

          {/* Nós */}
          {rota.nodes.map((n, i) => {
            const hl = ativo === i;
            const rx = Math.min(n.caixa.w, n.caixa.h) / 2;
            return (
              <g
                key={`no-${i}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover((cur) => (cur === i ? null : cur))}
              >
                <rect
                  x={n.caixa.x}
                  y={n.caixa.y}
                  width={n.caixa.w}
                  height={n.caixa.h}
                  rx={rx}
                  ry={rx}
                  fill={n.verde ? 'url(#mapaGradVerde)' : 'url(#mapaGradNo)'}
                  stroke={hl ? COR_HIGHLIGHT : '#141414'}
                  strokeWidth={hl ? Math.max(n.verde ? 1.65 : 1.15, 1.9) : n.verde ? 1.65 : 1.15}
                />
                {n.linhas.map((l, li) => (
                  <text
                    key={li}
                    x={n.cx[li]}
                    y={n.by[li]}
                    textAnchor="middle"
                    fontFamily={FONTE}
                    fontSize={l.size}
                    fontWeight={l.bold ? 700 : 400}
                    fontStyle={l.italic ? 'italic' : 'normal'}
                    fill={l.red ? '#ff0000' : '#000000'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {l.t}
                  </text>
                ))}
              </g>
            );
          })}

          {/* Rótulos soltos e título da página (posicionados exatamente como nos PDFs) */}
          {rota.rotulos.map((rt, i) => (
            <text
              key={`rt-${i}`}
              x={rt.x}
              y={rt.baseY}
              textAnchor="start"
              fontFamily={FONTE}
              fontSize={rt.size}
              fontWeight={rt.bold ? 700 : 400}
              fontStyle={rt.italic ? 'italic' : 'normal'}
              fill={rt.red ? '#ff0000' : '#000000'}
              transform={rt.angle ? `rotate(${rt.angle} ${rt.x} ${rt.baseY})` : undefined}
              style={{ pointerEvents: 'none' }}
            >
              {rt.t}
            </text>
          ))}
        </svg>

        {/* Tooltip */}
        {noAtivo && (
          <div
            style={{
              position: 'absolute',
              ...tipStyle,
              background: 'rgba(15, 23, 42, 0.94)',
              color: '#f8fafc',
              border: '1px solid rgba(129, 140, 248, 0.5)',
              borderRadius: '10px',
              padding: '10px 12px',
              width: '260px',
              fontSize: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
              pointerEvents: 'none',
              zIndex: 30,
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '11px', color: '#a5b4fc', marginBottom: '4px' }}>
              <i className="fas fa-microchip" style={{ marginRight: 5 }}></i>
              {pinned != null ? 'Nó fixado' : 'Nó'}
            </div>
            {noAtivo.linhas.map((l, i) => (
              <div key={i}>
                {l.t.length > 0 ? l.t : '\u00A0'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const botaoCtrl: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#ffffff',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  padding: '6px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
};
