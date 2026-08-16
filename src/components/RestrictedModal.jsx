import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Key, AlertTriangle, Clock } from 'lucide-react';
import { securityService } from '../services/securityService';

export default function RestrictedModal({ isOpen, onClose, onSuccess, targetModuleName }) {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg('');
      checkLockState();
    }
  }, [isOpen]);

  useEffect(() => {
    let timer;
    if (isLocked && remainingMs > 0) {
      timer = setInterval(() => {
        setRemainingMs((prev) => {
          if (prev <= 1000) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, remainingMs]);

  const checkLockState = () => {
    const lockedTime = securityService.isLockedOut();
    if (lockedTime) {
      setIsLocked(true);
      setRemainingMs(lockedTime);
    } else {
      setIsLocked(false);
      setRemainingMs(0);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLocked) return;

    const result = securityService.validateAdminPass(password);
    if (result.success) {
      onSuccess();
    } else {
      setPassword('');
      if (result.isLocked) {
        setIsLocked(true);
        setRemainingMs(result.remainingMs);
        setErrorMsg(result.message || 'Acceso bloqueado por 5 minutos debido a 3 intentos fallidos.');
      } else {
        setErrorMsg(result.message);
      }
    }
  };

  const formatTime = (ms) => {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ borderColor: isLocked ? '#f43f5e' : 'rgba(245, 158, 11, 0.4)' }}>
        <div className="modal-header" style={{ background: isLocked ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isLocked ? <ShieldAlert size={24} color="#f43f5e" /> : <Lock size={24} color="#f59e0b" />}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: isLocked ? '#fda4af' : '#fbbf24' }}>
                {isLocked ? '¡SISTEMA BLOQUEADO!' : 'Acceso Restringido'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Módulo solicitante: <strong>{targetModuleName}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="modal-body">
          {isLocked ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <Clock size={48} color="#f43f5e" style={{ margin: '0 auto 1rem', animation: 'spin 10s linear infinite' }} />
              <h4 style={{ color: '#fda4af', marginBottom: '0.5rem', fontWeight: '700' }}>
                3 Intentos Fallidos Detectados
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                El panel de administración se encuentra bloqueado temporalmente por seguridad.
              </p>
              <div className="badge badge-rose" style={{ fontSize: '1.2rem', padding: '0.5rem 1.2rem' }}>
                Tiempo Restante: {formatTime(remainingMs)}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: '1rem' }}>
                * Se ha generado un reporte de seguridad con los datos de IP y equipo.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  El rol actual es <strong>USUARIO</strong>. Introduce la clave de Administrador para desbloquear este módulo.
                </p>
              </div>

              {errorMsg && (
                <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Contraseña de Administrador:</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Escribe la clave de admin..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                  />
                  <Key size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  Desbloquear Acceso
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
