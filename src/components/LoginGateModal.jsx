import React, { useState, useEffect } from 'react';
import { Lock, Key, AlertTriangle, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { securityService } from '../services/securityService';

export default function LoginGateModal({ isOpen, onLoginSuccess }) {
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

    const result = securityService.validateLoginPass(password);
    if (result.success) {
      onLoginSuccess(result.role);
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
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <div 
        className="glass-card" 
        style={{
          maxWidth: '460px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          border: isLocked ? '2px solid #f43f5e' : '1px solid rgba(226, 232, 240, 0.9)',
          textAlign: 'center'
        }}
      >
        {/* Brand Icon Header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
          <div style={{
            background: isLocked ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'linear-gradient(135deg, #10b981, #059669)',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isLocked ? '0 10px 25px rgba(244, 63, 94, 0.35)' : '0 10px 25px rgba(16, 185, 129, 0.35)'
          }}>
            {isLocked ? <Lock color="#ffffff" size={32} /> : <Sparkles color="#ffffff" size={32} />}
          </div>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
          CONTA INOVATEL
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: '500', marginBottom: '1.8rem' }}>
          Sistema de Gestión Fiscal, Impuestos & Finanzas
        </p>

        {isLocked ? (
          <div style={{ padding: '1rem 0' }}>
            <Clock size={42} color="#f43f5e" style={{ margin: '0 auto 0.75rem', animation: 'spin 10s linear infinite' }} />
            <h4 style={{ color: '#e11d48', fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.4rem' }}>
              3 Intentos Fallidos Detectados
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.2rem' }}>
              El acceso se encuentra bloqueado temporalmente por seguridad.
            </p>
            <div className="badge badge-rose" style={{ fontSize: '1.25rem', padding: '0.6rem 1.4rem', fontWeight: '800' }}>
              Tiempo Restante: {formatTime(remainingMs)}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: '1.2rem', fontWeight: '600' }}>
              * Se ha registrado un reporte forense de seguridad.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            {errorMsg && (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                color: '#b91c1c', 
                padding: '0.8rem 1rem', 
                borderRadius: '12px', 
                fontSize: '0.85rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontWeight: '600' 
              }}>
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700', color: '#334155', fontSize: '0.88rem' }}>
                Contraseña de Acceso:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Introduce tu clave..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    paddingLeft: '2.75rem',
                    height: '48px',
                    fontSize: '1rem',
                    borderRadius: '12px',
                    borderColor: '#cbd5e1'
                  }}
                />
                <Key size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ 
                width: '100%', 
                height: '48px', 
                fontSize: '1rem', 
                fontWeight: '800', 
                justifyContent: 'center',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                gap: '0.5rem'
              }}
            >
              <span>Ingresar al Sistema</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lock size={12} /> Acceso protegido por autenticación
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
