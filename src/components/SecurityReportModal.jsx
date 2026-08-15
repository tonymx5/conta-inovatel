import React, { useState, useEffect } from 'react';
import { ShieldAlert, Terminal, AlertTriangle, Cpu, Globe, RefreshCw } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatDate } from '../utils/dateFormatter';

export default function SecurityReportModal({ isOpen, onClose }) {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadIncidents();
    }
  }, [isOpen]);

  const loadIncidents = () => {
    setIncidents(storageService.getSecurityIncidents());
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '780px' }}>
        <div className="modal-header" style={{ background: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={24} color="#f43f5e" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fda4af' }}>
                Reportes de Intrusos y Bloqueos de Seguridad
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Registro forense de intentos fallidos y bloqueos de contraseña de Administrador
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="badge badge-rose" style={{ fontSize: '0.85rem' }}>
              Incidencias Detectadas: {incidents.length}
            </span>
            <button className="btn-secondary" onClick={loadIncidents} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              <RefreshCw size={14} /> Actualizar Reportes
            </button>
          </div>

          {incidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <ShieldAlert size={40} color="#34d399" style={{ margin: '0 auto 0.8rem' }} />
              <h4 style={{ color: '#34d399', fontWeight: '600' }}>Sin Incidencias de Intrusión</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                No se han registrado bloqueos por contraseña incorrecta. El sistema está seguro.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {incidents.map((inc) => (
                <div key={inc.id} className="glass-card" style={{ borderLeft: '4px solid #f43f5e', background: 'rgba(30, 41, 59, 0.5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={18} color="#f43f5e" />
                      <span style={{ fontWeight: '700', color: '#fda4af', fontSize: '0.95rem' }}>
                        ¡Intento de Intrusión Detectado!
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#fda4af', fontWeight: '600' }}>
                      {formatDate(inc.timestamp, true)}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>IP Origen:</span>
                      <strong style={{ color: '#67e8f9', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Globe size={14} /> {inc.clientIp}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Nombre de Equipo / Host:</span>
                      <strong style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Cpu size={14} /> {inc.hostname}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Ubicación Aprox:</span>
                      <strong style={{ color: '#fbbf24' }}>{inc.approxLocation}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Intentos Fallidos:</span>
                      <strong style={{ color: '#f43f5e' }}>{inc.failedAttempts} de 3 (Bloqueado 5 min)</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '6px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    <div style={{ color: 'var(--text-dim)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Terminal size={12} /> Claves probadas por el intruso:
                    </div>
                    <div style={{ color: '#fca5a5' }}>
                      {inc.triedPasswords?.join('  |  ') || 'No registradas'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cerrar Reportes</button>
        </div>
      </div>
    </div>
  );
}
