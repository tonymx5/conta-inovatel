import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import RestrictedModal from './components/RestrictedModal';
import AuditLogModal from './components/AuditLogModal';
import SecurityReportModal from './components/SecurityReportModal';
import { FileText, Plus, BarChart3, TrendingUp, CreditCard, DollarSign, Receipt, Users } from 'lucide-react';
import { storageService } from './services/storageService';

// 7 Application Modules
import InvoicesModule from './components/InvoicesModule';
import OtherIncomeModule from './components/OtherIncomeModule';
import ProviderDeductionsModule from './components/ProviderDeductionsModule';
import ClientsModule from './components/ClientsModule';
import ExpensesModule from './components/ExpensesModule';
import AnalyticsModule from './components/AnalyticsModule';
import InvestmentsModule from './components/InvestmentsModule';

export default function App() {
  const [activeTab, setActiveTab] = useState('invoices');
  const [userRole, setUserRole] = useState('operator'); // Default: 'operator' (password 2020)

  useEffect(() => {
    // Initial silent sync with cloud database (Supabase)
    storageService.syncFromSupabase();
  }, []);
  
  // Modals Control
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);
  const [restrictedTargetName, setRestrictedTargetName] = useState('');
  const [pendingTabAfterUnlock, setPendingTabAfterUnlock] = useState(null);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const handleRestrictedClick = (moduleName, targetTabId = null) => {
    setRestrictedTargetName(moduleName);
    setPendingTabAfterUnlock(targetTabId);
    setShowRestrictedModal(true);
  };

  const handleUnlockSuccess = () => {
    setUserRole('admin');
    setShowRestrictedModal(false);
    if (pendingTabAfterUnlock) {
      setActiveTab(pendingTabAfterUnlock);
      setPendingTabAfterUnlock(null);
    }
  };

  const handleMobileNav = (tabId, label, isRestricted) => {
    if (isRestricted && userRole !== 'admin') {
      handleRestrictedClick(label, tabId);
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Glassmorphic Navigation Header with Notch Safe Area Inset Support */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        onOpenAuditLog={() => setShowAuditModal(true)}
        onOpenSecurityReport={() => setShowSecurityModal(true)}
        onRestrictedClick={(name) => handleRestrictedClick(name)}
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

      {/* Mobile Floating Bottom Navigation Bar (Inspired by Template Floating Dock & Green + Button) */}
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

        {/* Center Floating Green Action FAB (+) Button */}
        <button
          className="mobile-fab-btn"
          onClick={() => {
            if (activeTab !== 'invoices') setActiveTab('invoices');
            // Trigger new invoice form event if needed
          }}
          title="Nueva Factura"
        >
          <Plus size={28} strokeWidth={3} />
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
    </div>
  );
}
