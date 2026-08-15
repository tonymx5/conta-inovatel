// Security & Authentication Governance for Conta Inovatel

import { storageService } from './storageService';

const PASSWORDS = {
  OPERATOR: '2020',
  ADMIN: 'PulguitA'
};

const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const securityService = {
  // Check if admin is currently locked out
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

  // Validate Admin Password
  validateAdminPass: (inputPassword, triedHistory = []) => {
    // Check lockout first
    const lockedMs = securityService.isLockedOut();
    if (lockedMs) {
      return { success: false, isLocked: true, remainingMs: lockedMs };
    }

    if (inputPassword === PASSWORDS.ADMIN) {
      // Reset attempts on success
      localStorage.removeItem('admin_failed_attempts');
      localStorage.removeItem('admin_tried_passwords');
      storageService.logAudit('ADMIN', 'LOGIN_EXITOSO', 'Acceso Administrador concedido');
      return { success: true };
    }

    // Handle failure
    let attempts = parseInt(localStorage.getItem('admin_failed_attempts') || '0', 10) + 1;
    let triedPasswords = JSON.parse(localStorage.getItem('admin_tried_passwords') || '[]');
    triedPasswords.push(inputPassword);

    localStorage.setItem('admin_failed_attempts', attempts.toString());
    localStorage.setItem('admin_tried_passwords', JSON.stringify(triedPasswords));

    if (attempts >= 3) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem('admin_lockout_until', lockUntil.toString());

      // Trigger Security Incident Report Log!
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
    return inputPassword === PASSWORDS.OPERATOR;
  },

  // Helper to fetch IP and log security incident
  fetchClientIpAndLog: async (attempts, triedPasswords) => {
    let clientIp = '192.168.1.104 (LAN/Local)';
    let location = 'México (Ciudad de México)';
    try {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      if (data.ip) clientIp = data.ip;
    } catch (e) {
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
