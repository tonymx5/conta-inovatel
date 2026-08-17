import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import RestrictedModal from './components/RestrictedModal';
import AuditLogModal from './components/AuditLogModal';
import SecurityReportModal from './components/SecurityReportModal';
import LoginGateModal from './components/LoginGateModal';
import ConfigModal from './components/ConfigModal';
import { FileText, BarChart3, TrendingUp, CreditCard } from 'lucide-react';
import { storageService } from './services/storageService';

// 7 Application Modules
import InvoicesModule from './components/InvoicesModule';
import OtherIncomeModule from './components/OtherIncomeModule';
import ProviderDeductionsModule from './components/ProviderDeductionsModule';
import ClientsModule from './components/ClientsModule';
import ExpensesModule from './components/ExpensesModule';
import AnalyticsModule from './components/AnalyticsModule';
import InvestmentsModule from './components/InvestmentsModule';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 Minutos
const SESSION_STORAGE_KEY = 'conta_active_session';

const getInitialSessionState = () => {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      const { role, lastActivity } = JSON.parse(saved);
      if (Date.now() - lastActivity < INACTIVITY_TIMEOUT_MS) {
        return { locked: false, role };
      }
    }
  } catch (e) {
    console.error('Error reading session state:', e);
  }
  return { locked: true, role: 'operator' };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('invoices');
  const initialSession = getInitialSessionState();
  const [userRole, setUserRole] = useState(initialSession.role);
  const [isSessionLocked, setIsSessionLocked] = useState(initialSession.locked);

  useEffect(() => {
    // Initial silent sync with cloud database (Supabase) and active Realtime listener
    storageService.syncFromSupabase();
    storageService.initRealtimeSubscription();

    return () => {
      storageService.unsubscribeRealtime();
    };
  }, []);

  // Timer de Inactividad (10 min sin movimiento -> Log off / Bloqueo)
  useEffect(() => {
    if (isSessionLocked) return;

    const updateActivityTimestamp = () => {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          role: userRole,
          lastActivity: Date.now()
        }));
      } catch (e) {
        console.error('Error updating activity:', e);
      }
    };

    updateActivityTimestamp();

    const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    let lastUpdate = 0;

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 4000) { // Actualizar máximo cada 4 segundos
        lastUpdate = now;
        updateActivityTimestamp();
      }
    };

    activityEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const checkInactivityInterval = setInterval(() => {
      try {
        const saved = localStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
          const { lastActivity } = JSON.parse(saved);
          if (Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS) {
            console.warn('Cierre de sesión por inactividad de 10 minutos.');
            localStorage.removeItem(SESSION_STORAGE_KEY);
            setIsSessionLocked(true);
            setUserRole('operator');
            storageService.logAudit('SISTEMA', 'CIERRE_SESION_INACTIVIDAD', 'Sesión cerrada por 10 min de inactividad');
          }
        } else {
          setIsSessionLocked(true);
          setUserRole('operator');
        }
      } catch (e) {
        console.error('Error in inactivity check:', e);
      }
    }, 10000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearInterval(checkInactivityInterval);
    };
  }, [isSessionLocked, userRole]);
  // Modals Control
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);
  const [restrictedTargetName, setRestrictedTargetName] = useState('');
  const [pendingTabAfterUnlock, setPendingTabAfterUnlock] = useState(null);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const handleRestrictedClick = (moduleName, targetTabId = null) => {
    setRestrictedTargetName(moduleName);
    setPendingTabAfterUnlock(targetTabId);
    setShowRestrictedModal(true);
  };

  const handleUnlockSuccess = () => {
    setUserRole('admin');
    setShowRestrictedModal(false);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      role: 'admin',
      lastActivity: Date.now()
    }));
    if (pendingTabAfterUnlock) {
      setActiveTab(pendingTabAfterUnlock);
      setPendingTabAfterUnlock(null);
    }
  };

  const handleLoginSuccess = (role) => {
    setUserRole(role);
    setIsSessionLocked(false);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      role,
      lastActivity: Date.now()
    }));
  };

  const handleLockSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setIsSessionLocked(true);
    setUserRole('operator');
  };

  const handleMobileNav = (tabId, label, isRestricted) => {
    if (isRestricted && userRole !== 'admin') {
      handleRestrictedClick(label, tabId);
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Login Gatekeeper Lock Modal (Pide contraseña al inicio) */}
      <LoginGateModal
        isOpen={isSessionLocked}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Main Application Container with blur & opacity when locked */}
      <div 
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          filter: isSessionLocked ? 'blur(14px)' : 'none',
          opacity: isSessionLocked ? 0.18 : 1,
          pointerEvents: isSessionLocked ? 'none' : 'auto',
          userSelect: isSessionLocked ? 'none' : 'auto',
          transition: 'filter 0.4s ease, opacity 0.4s ease'
        }}
      >
        {/* Top Glassmorphic Navigation Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
          onOpenAuditLog={() => setShowAuditModal(true)}
          onOpenSecurityReport={() => setShowSecurityModal(true)}
          onOpenConfig={() => setShowConfigModal(true)}
          onRestrictedClick={(name) => handleRestrictedClick(name)}
          onLock={handleLockSession}
        />

        {/* Main Module Content */}
        <main style={{ flex: 1, padding: '1.25rem', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          {activeTab === 'invoices' && <InvoicesModule userRole={userRole} />}
          {activeTab === 'other_income' && <OtherIncomeModule userRole={userRole} />}
          {activeTab === 'provider_deductions' && <ProviderDeductionsModule userRole={userRole} />}
          {activeTab === 'clients' && <ClientsModule userRole={userRole} />}
          {activeTab === 'expenses' && <ExpensesModule userRole={userRole} />}
          {activeTab === 'analytics' && <AnalyticsModule userRole={userRole} />}
          {activeTab === 'investments' && <InvestmentsModule userRole={userRole} />}
        </main>

        {/* Mobile Floating Bottom Navigation Bar */}
        <nav className="mobile-bottom-nav">
          <button
            className={`mobile-nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => handleMobileNav('invoices', 'Facturas', false)}
          >
            <FileText size={20} color={activeTab === 'invoices' ? '#10b981' : '#64748b'} />
            <span>Facturas</span>
          </button>

          <button
            className={`mobile-nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => handleMobileNav('expenses', 'Gastos & Bancos', true)}
          >
            <CreditCard size={20} color={activeTab === 'expenses' ? '#10b981' : '#64748b'} />
            <span>Gastos</span>
          </button>

          <button
            className={`mobile-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleMobileNav('analytics', 'Métricas & Analíticas', true)}
          >
            <BarChart3 size={20} color={activeTab === 'analytics' ? '#10b981' : '#64748b'} />
            <span>Métricas</span>
          </button>

          <button
            className={`mobile-nav-item ${activeTab === 'investments' ? 'active' : ''}`}
            onClick={() => handleMobileNav('investments', 'Inversiones & Bot IA', true)}
          >
            <TrendingUp size={20} color={activeTab === 'investments' ? '#10b981' : '#64748b'} />
            <span>Inversiones</span>
          </button>
        </nav>

        {/* Modals */}
        <RestrictedModal
          isOpen={showRestrictedModal}
          onClose={() => setShowRestrictedModal(false)}
          onSuccess={handleUnlockSuccess}
          targetModuleName={restrictedTargetName}
        />

        <AuditLogModal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
        />

        <SecurityReportModal
          isOpen={showSecurityModal}
          onClose={() => setShowSecurityModal(false)}
        />

        <ConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          userRole={userRole}
        />
      </div>
    </div>
  );
}
