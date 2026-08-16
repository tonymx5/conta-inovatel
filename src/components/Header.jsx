import React from 'react';
import { 
  FileText, DollarSign, Receipt, Users, CreditCard, BarChart3, TrendingUp, 
  ShieldCheck, ShieldAlert, History, Lock, Unlock, Sparkles
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  userRole, 
  setUserRole, 
  onOpenAuditLog, 
  onOpenSecurityReport,
  onRestrictedClick 
}) {
  const tabs = [
    { id: 'invoices', label: 'Facturas', icon: FileText, restricted: false },
    { id: 'clients', label: 'Clientes', icon: Users, restricted: false },
    { id: 'other_income', label: 'Otros Ingresos', icon: DollarSign, restricted: true },
    { id: 'provider_deductions', label: 'Fact Prov', icon: Receipt, restricted: true },
    { id: 'expenses', label: 'Gastos & Bancos', icon: CreditCard, restricted: true },
    { id: 'analytics', label: 'Métricas & Analíticas', icon: BarChart3, restricted: true },
    { id: 'investments', label: 'Inversiones & Bot IA', icon: TrendingUp, restricted: true }
  ];

  const handleTabClick = (tab) => {
    if (tab.restricted && userRole !== 'admin') {
      onRestrictedClick(tab.label);
    } else {
      setActiveTab(tab.id);
    }
  };

  return (
    <header className="app-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            width: '46px',
            height: '46px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
          }}>
            <Sparkles color="#ffffff" size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#0f172a' }}>
              CONTA INOVATEL
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>
              Gestión Fiscal, Facturación, Impuestos & Finanzas Inteligentes
            </p>
          </div>
        </div>

        {/* Audit & Security Controls (Exclusivo para Administrador) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {userRole === 'admin' && (
            <>
              <button className="btn-secondary" onClick={onOpenAuditLog} style={{ fontSize: '0.85rem' }}>
                <History size={16} color="#10b981" /> Bitácora
              </button>

              <button className="btn-secondary" onClick={onOpenSecurityReport} style={{ fontSize: '0.85rem' }}>
                <ShieldAlert size={16} color="#f43f5e" /> Intrusos
              </button>
            </>
          )}

          {/* User Role Indicator */}
          <div style={{ background: 'rgba(255, 255, 255, 0.9)', border: '1px solid rgba(203, 213, 225, 0.6)', borderRadius: '9999px', padding: '0.4rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.65rem', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <span className={`badge ${userRole === 'admin' ? 'badge-amber' : 'badge-emerald'}`}>
              {userRole === 'admin' ? <ShieldCheck size={14} /> : <Lock size={14} />}
              {userRole === 'admin' ? 'ADMINISTRADOR' : 'OPERADOR (2020)'}
            </span>

            {userRole === 'admin' ? (
              <button
                onClick={() => setUserRole('operator')}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}
                title="Cerrar sesión de Admin y pasar a Operador"
              >
                <Lock size={13} /> Bloquear
              </button>
            ) : (
              <button
                onClick={() => onRestrictedClick('Panel de Administración')}
                style={{ background: 'none', border: 'none', color: '#b45309', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}
              >
                <Unlock size={13} /> Desbloquear Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Soft Pastel Navigation Pills */}
      <div className="nav-buttons-container">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          const isLockedForUser = t.restricted && userRole !== 'admin';

          return (
            <button
              key={t.id}
              onClick={() => handleTabClick(t)}
              className={`nav-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{t.label}</span>
              {isLockedForUser && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>🔒</span>}
            </button>
          );
        })}
      </div>
    </header>
  );
}
