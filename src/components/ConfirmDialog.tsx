import React from 'react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmação dentro do sistema visual (neumórfico/vidro),
 * substituindo o confirm() nativo do navegador.
 */
const ConfirmDialog: React.FC<Props> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="modal"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancel}
    >
      <div
        className="modal-content"
        style={{ width: 'min(92vw, 430px)', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <i
          className={danger ? 'fas fa-triangle-exclamation' : 'fas fa-circle-question'}
          style={{
            display: 'block',
            margin: '6px auto 14px',
            fontSize: 34,
            color: danger ? 'var(--err, #e5484d)' : 'var(--accent)',
          }}
        />
        <h3 style={{ borderBottom: 'none', padding: 0 }}>{title}</h3>
        <p style={{ color: 'var(--muted, #5d6b80)', fontSize: 14, padding: '4px 6px 10px' }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" style={{ minWidth: 130 }} onClick={onCancel}>
            <i className="fas fa-xmark" /> Cancelar
          </button>
          <button
            className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
            style={{ minWidth: 130 }}
            onClick={onConfirm}
          >
            <i className={danger ? 'fas fa-trash' : 'fas fa-check'} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
