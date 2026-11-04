import React, { useState, useEffect } from 'react';
import { Lock, Key, AlertTriangle, Clock, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, UserCheck } from 'lucide-react';
import { securityService } from '../services/securityService';

export default function LoginGateModal({ isOpen, onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  // Estados de Recuperación de PIN (Opción 1)
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryTarget, setRecoveryTarget] = useState('edson');
  const [masterKey, setMasterKey] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg('');
      setShowRecovery(false);
      resetRecoveryForm();
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

  const resetRecoveryForm = () => {
    setMasterKey('');
    setNewPin('');
    setConfirmPin('');
    setRecoveryError('');
    setRecoverySuccess('');
    setIsRecovering(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked || isVerifying) return;

    setIsVerifying(true);
    setErrorMsg('');
    try {
      const result = await securityService.validateLoginPass(password);
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
    } catch {
      setErrorMsg('Error de conexión al verificar credenciales.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    if (isRecovering) return;

    if (newPin.trim() !== confirmPin.trim()) {
      setRecoveryError('Los PINs introducidos no coinciden.');
      return;
    }

    if (newPin.trim().length < 4) {
      setRecoveryError('El nuevo PIN debe tener al menos 4 caracteres.');
      return;
    }

    setIsRecovering(true);
    setRecoveryError('');
    setRecoverySuccess('');

    try {
      const result = await securityService.recoverPinWithMasterKey(
        recoveryTarget,
        masterKey,
        newPin.trim()
      );

      if (result.success) {
        setRecoverySuccess(result.message || '¡PIN restablecido con éxito! Iniciando sesión...');
        const resolvedPin = newPin.trim();
        setTimeout(async () => {
          setShowRecovery(false);
          setPassword(resolvedPin);
          const autoLog = await securityService.validateLoginPass(resolvedPin);
          if (autoLog.success) {
            onLoginSuccess(autoLog.role);
          }
        }, 1400);
      } else {
        if (result.isLocked) {
          setIsLocked(true);
          setRemainingMs(result.remainingMs);
          setShowRecovery(false);
        } else {
          setRecoveryError(result.message || 'Clave Maestra de Seguridad incorrecta.');
        }
      }
    } catch {
      setRecoveryError('Error de comunicación con el servidor de autenticación.');
    } finally {
      setIsRecovering(false);
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
          maxWidth: showRecovery ? '480px' : '460px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          border: isLocked ? '2px solid #f43f5e' : '1px solid rgba(226, 232, 240, 0.9)',
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Brand Icon Header con Icono Oficial Simétrico */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
          <img 
            src="/app-icon.jpg" 
            alt="Conta Inovatel App Icon"
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '18px',
              objectFit: 'cover',
              boxShadow: '0 12px 25px rgba(0, 0, 0, 0.2), 0 0 15px rgba(16, 185, 129, 0.25)',
              border: isLocked ? '2px solid #f43f5e' : '2px solid rgba(255, 255, 255, 0.9)'
            }}
          />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
          CONTA INOVATEL
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: '500', marginBottom: '1.6rem' }}>
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
        ) : showRecovery ? (
          /* FORMULARIO DE RECUPERACIÓN DE PIN */
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <button 
                type="button"
                onClick={() => { setShowRecovery(false); resetRecoveryForm(); }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#0284c7', 
                  fontSize: '0.85rem', 
                  fontWeight: '700', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.35rem', 
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <ArrowLeft size={16} /> Volver al Login
              </button>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rescate Seguro
              </span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <ShieldCheck size={18} color="#0284c7" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Recuperación de PIN
                </h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Ingresa la Clave Maestra de Inovatel para asignar un nuevo PIN a tu usuario.
              </p>
            </div>

            {recoveryError && (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                color: '#b91c1c', 
                padding: '0.75rem 0.9rem', 
                borderRadius: '12px', 
                fontSize: '0.82rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoverySuccess && (
              <div style={{ 
                background: '#ecfdf5', 
                border: '1px solid #a7f3d0', 
                color: '#065f46', 
                padding: '0.75rem 0.9rem', 
                borderRadius: '12px', 
                fontSize: '0.82rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                <span>{recoverySuccess}</span>
              </div>
            )}

            <form onSubmit={handleRecoverySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Selector de Perfil */}
              <div>
                <label className="form-label" style={{ fontWeight: '700', color: '#334155', fontSize: '0.82rem', marginBottom: '0.4rem', display: 'block' }}>
                  Usuario a Restablecer:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setRecoveryTarget('edson')}
                    style={{
                      padding: '0.6rem 0.8rem',
                      borderRadius: '10px',
                      border: recoveryTarget === 'edson' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: recoveryTarget === 'edson' ? '#f0f9ff' : '#ffffff',
                      color: recoveryTarget === 'edson' ? '#0369a1' : '#475569',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <UserCheck size={16} /> Edson (Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecoveryTarget('karla')}
                    style={{
                      padding: '0.6rem 0.8rem',
                      borderRadius: '10px',
                      border: recoveryTarget === 'karla' ? '2px solid #10b981' : '1px solid #cbd5e1',
                      background: recoveryTarget === 'karla' ? '#ecfdf5' : '#ffffff',
                      color: recoveryTarget === 'karla' ? '#047857' : '#475569',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <UserCheck size={16} /> Karla (Operador)
                  </button>
                </div>

                {recoveryTarget === 'karla' && (
                  <p style={{ fontSize: '0.74rem', color: '#059669', background: '#ecfdf5', padding: '0.45rem 0.65rem', borderRadius: '8px', marginTop: '0.5rem', margin: '0.5rem 0 0 0', fontWeight: '500' }}>
                    💡 Karla: Edson también puede restablecer tu PIN en 1-clic desde el panel de Configuración.
                  </p>
                )}
              </div>

              {/* Clave Maestra */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#334155', fontSize: '0.82rem' }}>
                  Clave Maestra de Seguridad (Master Key):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Clave maestra de rescate..."
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      paddingLeft: '2.5rem',
                      height: '44px',
                      fontSize: '0.92rem',
                      borderRadius: '10px',
                      borderColor: '#cbd5e1'
                    }}
                  />
                  <ShieldCheck size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Nuevo PIN y Confirmar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#334155', fontSize: '0.82rem' }}>
                    Nuevo PIN:
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Mín. 4 dígitos"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      height: '44px',
                      fontSize: '0.92rem',
                      borderRadius: '10px',
                      borderColor: '#cbd5e1',
                      padding: '0 0.8rem'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#334155', fontSize: '0.82rem' }}>
                    Confirmar PIN:
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Repite el PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      height: '44px',
                      fontSize: '0.92rem',
                      borderRadius: '10px',
                      borderColor: '#cbd5e1',
                      padding: '0 0.8rem'
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isRecovering}
                style={{ 
                  width: '100%', 
                  height: '46px', 
                  fontSize: '0.95rem', 
                  fontWeight: '800', 
                  justifyContent: 'center',
                  borderRadius: '12px',
                  background: isRecovering ? '#94a3b8' : 'linear-gradient(135deg, #0284c7, #0369a1)',
                  boxShadow: isRecovering ? 'none' : '0 4px 15px rgba(2, 132, 199, 0.35)',
                  gap: '0.5rem',
                  opacity: isRecovering ? 0.7 : 1,
                  cursor: isRecovering ? 'wait' : 'pointer',
                  marginTop: '0.35rem'
                }}
              >
                <span>{isRecovering ? 'Validando Clave Maestra...' : 'Restablecer PIN y Entrar'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        ) : (
          /* FORMULARIO DE ACCESO HABITUAL */
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
              disabled={isVerifying}
              style={{ 
                width: '100%', 
                height: '48px', 
                fontSize: '1rem', 
                fontWeight: '800', 
                justifyContent: 'center',
                borderRadius: '12px',
                background: isVerifying ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: isVerifying ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.35)',
                gap: '0.5rem',
                opacity: isVerifying ? 0.7 : 1,
                cursor: isVerifying ? 'wait' : 'pointer'
              }}
            >
              <span>{isVerifying ? 'Verificando sesión segura...' : 'Ingresar al Sistema'}</span>
              <ArrowRight size={18} />
            </button>

            {/* Enlace para Recuperación de Clave */}
            <div style={{ textAlign: 'center', marginTop: '0.2rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowRecovery(true);
                  resetRecoveryForm();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  textDecoration: 'underline'
                }}
              >
                ¿Olvidaste tu contraseña o PIN?
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '0.2rem' }}>
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
