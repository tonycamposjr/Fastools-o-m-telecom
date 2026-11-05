import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ToolDef } from '../types';

interface Props {
  open: boolean;
  tools: ToolDef[];
  /** Extra à parte: nome + id de ferramentas especiais (ex.: Painel de Ferramentas, Admin) */
  extras?: Array<{ id: string; name: string; icon: string }>;
  onClose: () => void;
  onGo: (tabId: string) => void;
}

/**
 * Paleta de comandos (Ctrl+K): pular direto para qualquer ferramenta
 * digitando uma parte do nome. Navegação por teclado completa.
 */
const CommandPalette: React.FC<Props> = ({ open, tools, extras = [], onClose, onGo }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const list = [
      { id: 'dashboard', name: 'Painel de Ferramentas', icon: 'fa-th-large' },
      ...extras,
      ...tools.map((t) => ({ id: t.id, name: t.name, icon: t.icon })),
    ];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (tools.find((t) => t.id === it.id)?.desc || '').toLowerCase().includes(q)
    );
  }, [tools, extras, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (selected >= items.length) setSelected(0);
  }, [items, selected]);

  if (!open) return null;

  const go = (id: string) => {
    onClose();
    onGo(id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selected]) go(items[selected].id);
    }
  };

  return (
    <div className="modal" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '9dvh' }} onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: 'min(92vw, 560px)', margin: 0, padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px' }}>
          <i className="fas fa-magnifying-glass" style={{ color: 'var(--accent)', fontSize: 15 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ferramenta… (ex.: OTDR, Carimbo, KML)"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
            aria-label="Buscar ferramenta"
          />
          <kbd style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border, #b4bec9)', borderRadius: 6, padding: '2px 7px' }}>Esc</kbd>
        </div>
        <div style={{ maxHeight: '46dvh', overflowY: 'auto', borderTop: '1px solid var(--border, #b4bec9)', padding: 6 }}>
          {items.length === 0 && (
            <p style={{ padding: '18px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>
              Nenhuma ferramenta corresponde a “{query}”.
            </p>
          )}
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => go(it.id)}
              onMouseEnter={() => setSelected(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '11px 12px',
                margin: 0,
                border: 'none',
                borderRadius: 12,
                background: i === selected ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
                color: i === selected ? 'var(--accent)' : 'var(--fg)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <i className={`fas ${it.icon}`} style={{ width: 20, textAlign: 'center', color: 'var(--accent)' }} />
              {it.name}
              {i === selected && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>Enter ⏎</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
