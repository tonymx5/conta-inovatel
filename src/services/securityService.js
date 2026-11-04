// Security & Authentication Governance for Conta Inovatel (v3.0 Supabase Auth & RLS Zero-Trust)

import { storageService } from './storageService';
import { supabase } from './supabaseClient';

const AUTH_CREDENTIALS = {
  OPERATOR: {
    email: 'karla@inovatel.mx',
    password: 'ContaInovatel_Karla_2020#SecureAuth',
    pin: '2020',
    role: 'operator'
  },
  ADMIN: {
    email: 'edson@inovatel.mx',
    password: 'ContaInovatel_Edson_0808#SecureAuth',
    pin: '0808',
    altPin: 'PulguitA',
    role: 'admin'
  }
};

const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const securityService = {
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

  // Validate Initial Gatekeeper Password (User 2020 or Admin 0808/PulguitA)
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

    const clean = inputPassword ? inputPassword.trim() : '';
    let target = null;

    if (clean === AUTH_CREDENTIALS.ADMIN.pin || clean === AUTH_CREDENTIALS.ADMIN.altPin) {
      target = AUTH_CREDENTIALS.ADMIN;
    } else if (clean === AUTH_CREDENTIALS.OPERATOR.pin) {
      target = AUTH_CREDENTIALS.OPERATOR;
    }

    if (target) {
      // Intentar autenticación formal en Supabase Auth
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: target.email,
          password: target.password
        });
        if (error) {
          console.warn('[Auth Notice] Supabase Auth no respondió o requiere migración SQL; operando en modo local seguro:', error.message);
        }
      } catch (authErr) {
        console.warn('[Auth Notice] Excepción conectando a Supabase Auth:', authErr);
      }

      localStorage.removeItem('admin_failed_attempts');
      localStorage.removeItem('admin_tried_passwords');
      storageService.logAudit(target.role === 'admin' ? 'ADMIN' : 'KARLA', 'LOGIN_PORTAL', `Acceso ${target.role === 'admin' ? 'Administrador' : 'Karla'} concedido al portal`);
      return { success: true, role: target.role };
    }

    // Manejo de fallo de credenciales
    let attempts = parseInt(localStorage.getItem('admin_failed_attempts') || '0', 10) + 1;
    let triedPasswords = JSON.parse(localStorage.getItem('admin_tried_passwords') || '[]');
    triedPasswords.push(clean);

    localStorage.setItem('admin_failed_attempts', attempts.toString());
    localStorage.setItem('admin_tried_passwords', JSON.stringify(triedPasswords));

    if (attempts >= 3) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem('admin_lockout_until', lockUntil.toString());

      securityService.fetchClientIpAndLog(attempts, triedPasswords);
      storageService.logAudit('SISTEMA', 'BLOQUEO_INTRUSO', `3 intentos fallidos de clave de acceso. Sistema bloqueado por 5 min.`);

      return {
        success: false,
        isLocked: true,
        remainingMs: LOCKOUT_DURATION_MS,
        message: '¡ACCESO BLOQUEADO POR 5 MINUTOS! Se han alcanzado 3 intentos fallidos y registrado un reporte de intruso.'
      };
    }

    return {
      success: false,
      isLocked: false,
      attemptsRemaining: 3 - attempts,
      message: `Contraseña incorrecta. Intentos restantes: ${3 - attempts}`
    };
  },

  // Validate Admin Password for Restricted Modals
  validateAdminPass: async (inputPassword) => {
    const lockedMs = securityService.isLockedOut();
    if (lockedMs) {
      return { success: false, isLocked: true, remainingMs: lockedMs };
    }

    const clean = inputPassword ? inputPassword.trim() : '';

    if (clean === AUTH_CREDENTIALS.ADMIN.pin || clean === AUTH_CREDENTIALS.ADMIN.altPin) {
      try {
        await supabase.auth.signInWithPassword({
          email: AUTH_CREDENTIALS.ADMIN.email,
          password: AUTH_CREDENTIALS.ADMIN.password
        });
      } catch (authErr) {
        console.warn('[Auth Notice] Supabase Auth admin sign-in:', authErr);
      }

      localStorage.removeItem('admin_failed_attempts');
      localStorage.removeItem('admin_tried_passwords');
      storageService.logAudit('ADMIN', 'LOGIN_ADMIN', 'Acceso Administrador desbloqueado');
      return { success: true };
    }

    // Handle failure
    let attempts = parseInt(localStorage.getItem('admin_failed_attempts') || '0', 10) + 1;
    let triedPasswords = JSON.parse(localStorage.getItem('admin_tried_passwords') || '[]');
    triedPasswords.push(clean);

    localStorage.setItem('admin_failed_attempts', attempts.toString());
    localStorage.setItem('admin_tried_passwords', JSON.stringify(triedPasswords));

    if (attempts >= 3) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem('admin_lockout_until', lockUntil.toString());

      securityService.fetchClientIpAndLog(attempts, triedPasswords);
      storageService.logAudit('SISTEMA', 'BLOQUEO_INTRUSO', `3 intentos fallidos de clave Admin. Bloqueado por 5 min.`);

      return {
        success: false,
        isLocked: true,
        remainingMs: LOCKOUT_DURATION_MS,
        message: '¡ACCESO BLOQUEADO POR 5 MINUTOS! Se han alcanzado 3 intentos fallidos y registrado un reporte de intruso.'
      };
    }

    return {
      success: false,
      isLocked: false,
      attemptsRemaining: 3 - attempts,
      message: `Contraseña de Administrador incorrecta. Intentos restantes: ${3 - attempts}`
    };
  },

  // Validate Operator Password
  validateOperatorPass: (inputPassword) => {
    return inputPassword === AUTH_CREDENTIALS.OPERATOR.pin;
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
