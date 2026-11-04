// Security & Authentication Governance for Conta Inovatel (v3.0 Supabase Auth & RLS Zero-Trust)

import { storageService } from './storageService';
import { supabase } from './supabaseClient';

const AUTH_PROFILES = {
  OPERATOR: {
    email: 'karla@inovatel.mx',
    label: 'Karla',
    role: 'operator'
  },
  ADMIN: {
    email: 'edson@inovatel.mx',
    label: 'Edson',
    role: 'admin'
  }
};

const buildAuthPassword = (label, pin) => `ContaInovatel_${label}_${pin}#SecureAuth`;

const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const securityService = {
  // Stable client identifier for server-side brute-force lockout RPC
  getClientIdentifier: () => {
    let cid = localStorage.getItem('conta_client_lock_id');
    if (!cid) {
      cid = `web-${window.location.hostname || 'local'}-${navigator.userAgent.slice(0, 48)}`;
      localStorage.setItem('conta_client_lock_id', cid);
    }
    return cid;
  },

  // Check if admin/user is currently locked out
  isLockedOut: () => {
    const lockUntil = localStorage.getItem('admin_lockout_until');
    if (!lockUntil) return false;
    const remaining = parseInt(lockUntil, 10) - Date.now();
    if (remaining > 0) {
      return remaining; // Return remaining milliseconds
    }
    // Lock expired
    localStorage.removeItem('admin_lockout_until');
    localStorage.removeItem('admin_failed_attempts');
    localStorage.removeItem('admin_tried_passwords');
    return false;
  },

  // Validate Initial Gatekeeper Password via Supabase Auth (Zero-Trust: no PINs in bundle)
  validateLoginPass: async (inputPassword) => {
    const lockedMs = securityService.isLockedOut();
    if (lockedMs) {
      return { 
        success: false, 
        isLocked: true, 
        remainingMs: lockedMs, 
        message: '¡ACCESO BLOQUEADO POR 5 MINUTOS! Se han detectado múltiples intentos fallidos.' 
      };
    }

    const clientId = securityService.getClientIdentifier();
    try {
      const { data: srvLock } = await supabase.rpc('verificar_lockout_pin', { p_ip: clientId });
      if (srvLock?.is_locked && srvLock?.remaining_ms > 0) {
        localStorage.setItem('admin_lockout_until', (Date.now() + Number(srvLock.remaining_ms)).toString());
        return {
          success: false,
          isLocked: true,
          remainingMs: Number(srvLock.remaining_ms),
          message: '¡ACCESO BLOQUEADO POR SERVIDOR (5 MINUTOS)! Se han detectado múltiples intentos fallidos.'
        };
      }
    } catch {
      // Continuar con verificación de sesión
    }

    const clean = inputPassword ? inputPassword.trim() : '';
    let matchedProfile = null;

    if (clean) {
      for (const profile of [AUTH_PROFILES.ADMIN, AUTH_PROFILES.OPERATOR]) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: buildAuthPassword(profile.label, clean)
        });
        if (!error && data?.session) {
          matchedProfile = profile;
          break;
        }
      }
    }

    if (matchedProfile) {
      supabase.rpc('registrar_intento_pin', { p_ip: clientId, p_exito: true }).catch(() => {});
      localStorage.removeItem('admin_failed_attempts');
      localStorage.removeItem('admin_tried_passwords');
      storageService.logAudit(
        matchedProfile.role === 'admin' ? 'ADMIN' : 'KARLA',
        'LOGIN_PORTAL',
        `Acceso ${matchedProfile.role === 'admin' ? 'Administrador' : 'Karla'} concedido al portal`
      );
      return { success: true, role: matchedProfile.role };
    }

    // Manejo de fallo de credenciales (Servidor + Cliente)
    let srvLockState = null;
    try {
      const { data } = await supabase.rpc('registrar_intento_pin', { p_ip: clientId, p_exito: false });
      srvLockState = data;
    } catch {
      // Fallback a conteo local si falla red
    }

    let attempts = parseInt(localStorage.getItem('admin_failed_attempts') || '0', 10) + 1;
    let triedPasswords = JSON.parse(localStorage.getItem('admin_tried_passwords') || '[]');
    triedPasswords.push('[REDACTED_ATTEMPT]');

    localStorage.setItem('admin_failed_attempts', attempts.toString());
    localStorage.setItem('admin_tried_passwords', JSON.stringify(triedPasswords));

    if (attempts >= 3 || srvLockState?.is_locked) {
      const remainingMs = Number(srvLockState?.remaining_ms) || LOCKOUT_DURATION_MS;
      const lockUntil = Date.now() + remainingMs;
      localStorage.setItem('admin_lockout_until', lockUntil.toString());

      securityService.fetchClientIpAndLog(attempts, triedPasswords);
      storageService.logAudit('SISTEMA', 'BLOQUEO_INTRUSO', '3 intentos fallidos de clave de acceso. Sistema bloqueado por 5 min.');

      return {
        success: false,
        isLocked: true,
        remainingMs,
        message: '¡ACCESO BLOQUEADO POR 5 MINUTOS! Se han alcanzado 3 intentos fallidos y registrado un reporte de intruso.'
      };
    }

    const attemptsRemaining = srvLockState?.attempts_remaining ?? (3 - attempts);
    return {
      success: false,
      isLocked: false,
      attemptsRemaining,
      message: `Contraseña incorrecta. Intentos restantes: ${attemptsRemaining}`
    };
  },

  // Validate Admin Password for Restricted Modals via Supabase Auth
  validateAdminPass: async (inputPassword) => {
    const lockedMs = securityService.isLockedOut();
    if (lockedMs) {
      return { success: false, isLocked: true, remainingMs: lockedMs };
    }

    const clientId = securityService.getClientIdentifier();
    try {
      const { data: srvLock } = await supabase.rpc('verificar_lockout_pin', { p_ip: clientId });
      if (srvLock?.is_locked && srvLock?.remaining_ms > 0) {
        localStorage.setItem('admin_lockout_until', (Date.now() + Number(srvLock.remaining_ms)).toString());
        return { success: false, isLocked: true, remainingMs: Number(srvLock.remaining_ms) };
      }
    } catch {
      // Continuar con verificación
    }

    const clean = inputPassword ? inputPassword.trim() : '';

    if (clean) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: AUTH_PROFILES.ADMIN.email,
        password: buildAuthPassword(AUTH_PROFILES.ADMIN.label, clean)
      });

      if (!error && data?.session) {
        supabase.rpc('registrar_intento_pin', { p_ip: clientId, p_exito: true }).catch(() => {});
        localStorage.removeItem('admin_failed_attempts');
        localStorage.removeItem('admin_tried_passwords');
        storageService.logAudit('ADMIN', 'LOGIN_ADMIN', 'Acceso Administrador desbloqueado');
        return { success: true };
      }
    }

    // Handle failure
    let srvLockState = null;
    try {
      const { data } = await supabase.rpc('registrar_intento_pin', { p_ip: clientId, p_exito: false });
      srvLockState = data;
    } catch {
      // Fallback local
    }

    let attempts = parseInt(localStorage.getItem('admin_failed_attempts') || '0', 10) + 1;
    let triedPasswords = JSON.parse(localStorage.getItem('admin_tried_passwords') || '[]');
    triedPasswords.push('[REDACTED_ATTEMPT]');

    localStorage.setItem('admin_failed_attempts', attempts.toString());
    localStorage.setItem('admin_tried_passwords', JSON.stringify(triedPasswords));

    if (attempts >= 3 || srvLockState?.is_locked) {
      const remainingMs = Number(srvLockState?.remaining_ms) || LOCKOUT_DURATION_MS;
      const lockUntil = Date.now() + remainingMs;
      localStorage.setItem('admin_lockout_until', lockUntil.toString());

      securityService.fetchClientIpAndLog(attempts, triedPasswords);
      storageService.logAudit('SISTEMA', 'BLOQUEO_INTRUSO', '3 intentos fallidos de clave Admin. Bloqueado por 5 min.');

      return {
        success: false,
        isLocked: true,
        remainingMs,
        message: '¡ACCESO BLOQUEADO POR 5 MINUTOS! Se han alcanzado 3 intentos fallidos y registrado un reporte de intruso.'
      };
    }

    const attemptsRemaining = srvLockState?.attempts_remaining ?? (3 - attempts);
    return {
      success: false,
      isLocked: false,
      attemptsRemaining,
      message: `Contraseña de Administrador incorrecta. Intentos restantes: ${attemptsRemaining}`
    };
  },

  // Helper to fetch IP and log security incident
  fetchClientIpAndLog: async (attempts, triedPasswords) => {
    let clientIp = '192.168.1.104 (LAN/Local)';
    let location = 'México (Ciudad de México)';
    try {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      if (data.ip) clientIp = data.ip;
    } catch {
      console.warn('IP fetch fallback to LAN');
    }

    storageService.logSecurityIncident({
      attempts,
      triedPasswords,
      ip: clientIp,
      hostname: window.location.hostname || 'DESKTOP-CLIENT',
      location
    });
  },

  // Reset user PIN by Administrator (Edson resetting Karla or himself)
  adminResetUserPin: async (targetUser, newPin) => {
    const cleanPin = (newPin || '').trim();
    if (cleanPin.length < 4) {
      return { success: false, message: 'El PIN debe contener al menos 4 caracteres.' };
    }

    const targetEmail = targetUser === 'karla' ? AUTH_PROFILES.OPERATOR.email : AUTH_PROFILES.ADMIN.email;
    const targetLabel = targetUser === 'karla' ? 'Karla' : 'Edson';

    try {
      const { data, error } = await supabase.rpc('admin_reset_user_pin', {
        p_target_email: targetEmail,
        p_new_pin: cleanPin
      });

      if (!error && data?.success) {
        storageService.logAudit('ADMIN', 'RESET_PIN_EXITO', `PIN de ${targetLabel} actualizado.`);
        return { success: true, message: data.message };
      }

      if (error) {
        if (targetUser === 'edson') {
          const { error: updErr } = await supabase.auth.updateUser({
            password: buildAuthPassword('Edson', cleanPin)
          });
          if (!updErr) {
            storageService.logAudit('ADMIN', 'CAMBIO_PROPIO_PIN', 'PIN de Administrador actualizado vía Auth.');
            return { success: true, message: 'Tu PIN de Administrador se actualizó correctamente.' };
          }
        }
        return { 
          success: false, 
          message: error.message || 'Error al restablecer PIN en la base de datos.' 
        };
      }

      return { success: false, message: data?.message || 'No fue posible restablecer el PIN.' };
    } catch (err) {
      return { success: false, message: `Error de conexión: ${err.message}` };
    }
  },

  // Recover PIN using Master Recovery Key (Emergency Gatekeeper)
  recoverPinWithMasterKey: async (targetUser, masterKey, newPin) => {
    const cleanPin = (newPin || '').trim();
    const cleanMaster = (masterKey || '').trim();

    if (!cleanMaster) {
      return { success: false, message: 'Por favor introduce la Clave Maestra de Seguridad.' };
    }

    if (cleanPin.length < 4) {
      return { success: false, message: 'El nuevo PIN debe tener al menos 4 caracteres.' };
    }

    const clientId = securityService.getClientIdentifier();

    try {
      const { data, error } = await supabase.rpc('recuperar_pin_con_master_key', {
        p_ip: clientId,
        p_target_user: targetUser,
        p_master_key: cleanMaster,
        p_new_pin: cleanPin
      });

      if (error) {
        return { 
          success: false, 
          message: error.message?.includes('function') 
            ? 'Función de rescate pendiente de activación en Supabase. Aplica "supabase_pin_reset_and_recovery.sql".'
            : (error.message || 'Error en servidor de autenticación.') 
        };
      }

      if (data?.is_locked) {
        const remainingMs = Number(data.remaining_ms) || LOCKOUT_DURATION_MS;
        localStorage.setItem('admin_lockout_until', (Date.now() + remainingMs).toString());
        return { success: false, isLocked: true, remainingMs, message: data.message };
      }

      if (data?.success) {
        localStorage.removeItem('admin_failed_attempts');
        localStorage.removeItem('admin_tried_passwords');
        localStorage.removeItem('admin_lockout_until');
        return { success: true, message: data.message };
      }

      return { success: false, message: data?.message || 'Clave Maestra incorrecta.' };
    } catch (err) {
      return { success: false, message: `Error de red al procesar recuperación: ${err.message}` };
    }
  },

  // Update Master Recovery Key (Admin only)
  adminUpdateMasterRecoveryKey: async (newMasterKey) => {
    const clean = (newMasterKey || '').trim();
    if (clean.length < 8) {
      return { success: false, message: 'La Clave Maestra debe tener al menos 8 caracteres.' };
    }

    try {
      const { data, error } = await supabase.rpc('admin_update_master_recovery_key', {
        p_new_master_key: clean
      });

      if (!error && data?.success) {
        storageService.logAudit('ADMIN', 'UPDATE_MASTER_KEY', 'Clave Maestra de Seguridad actualizada.');
        return { success: true, message: data.message };
      }

      return { success: false, message: error?.message || data?.message || 'Error al actualizar Clave Maestra.' };
    } catch (err) {
      return { success: false, message: `Error de conexión: ${err.message}` };
    }
  }
};
