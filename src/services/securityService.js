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
  }
};
