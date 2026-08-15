import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, UserCheck } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatDate } from '../utils/dateFormatter';

export default function AuditLogModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = () => {
    setLogs(storageService.getAuditLogs());
  };

  if (!isOpen) return null;

  const filteredLogs = logs.filter(l => 
    l.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '850px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={24} color="#34d399" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>
                Bitácora Transaccional y Auditoría (`Audit Trail`)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Saber exactamente quién modificó o creó cada registro en la plataforma
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por usuario, acción o folio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.4rem' }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            <button className="btn-secondary" onClick={loadLogs} style={{ padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}>
              <RefreshCw size={14} /> Recargar
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Detalles del Registro</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No se encontraron registros de auditoría.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '0.82rem', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {formatDate(l.timestamp, true)}
                      </td>
                      <td>
                        <span className={`badge ${l.username === 'ADMIN' ? 'badge-amber' : 'badge-emerald'}`}>
                          <UserCheck size={12} /> {l.username}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', fontSize: '0.85rem', color: '#67e8f9' }}>
                        {l.action}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{l.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cerrar Bitácora</button>
        </div>
      </div>
    </div>
  );
}
