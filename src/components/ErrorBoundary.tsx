import React from 'react';

interface Props {
  /** Nome da ferramenta exibida no fallback */
  toolName: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** Isolamento de falha por aba: um erro numa ferramenta não derruba o app inteiro. */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error(`[ErrorBoundary:${this.props.toolName}]`, error);
  }

  private reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            background: 'var(--card, #eef2f7)',
            border: '1px solid var(--border, #b4bec9)',
            borderRadius: 18,
            padding: '34px 26px',
            textAlign: 'center',
            margin: '10px 0',
          }}
        >
          <i className="fas fa-triangle-exclamation" style={{ color: 'var(--warning, #f0a01f)', fontSize: 30 }} />
          <h3 style={{ margin: '12px 0 6px', color: 'var(--fg-heading, #141b29)' }}>
            “{this.props.toolName}” encontrou um problema
          </h3>
          <p style={{ color: 'var(--muted, #5d6b80)', fontSize: 14, maxWidth: 460, margin: '0 auto 4px' }}>
            A ferramenta foi interrompida, mas o resto do app continua funcionando. Suas
            configurações e registros estão salvos neste dispositivo.
          </p>
          <p style={{ color: 'var(--muted, #5d6b80)', fontSize: 12, opacity: 0.8, maxWidth: 520, margin: '0 auto 18px' }}>
            Detalhe: {this.state.message || 'erro desconhecido'}
          </p>
          <button
            className="btn btn-primary btn-sm"
            style={{ margin: '0 8px' }}
            onClick={this.reset}
          >
            <i className="fas fa-rotate-right" /> Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
