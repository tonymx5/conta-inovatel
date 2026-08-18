import React from 'react';
import { AlertTriangle, RotateCcw, ShieldCheck } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary atrapó un error no controlado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0e1a',
          color: '#f8fafc',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#131b2e',
            borderRadius: '16px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 20px rgba(239, 68, 68, 0.1)',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#ffffff' }}>
              Incidencia de Renderizado Detectada
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
              El sistema protegió tus datos contables y evitó el cierre forzado. Tu información sigue intacta en la base de datos.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#0a0e1a',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                fontSize: '12px',
                color: '#f87171',
                textAlign: 'left',
                fontFamily: 'monospace',
                marginBottom: '24px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <ShieldCheck size={16} color="#38bdf8" />
                Reintentar Módulo
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <RotateCcw size={16} />
                Recargar Portal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
