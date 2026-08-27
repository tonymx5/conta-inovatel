import React, { useState, useEffect } from 'react';
import { 
  FileText, DollarSign, Receipt, Users, CreditCard, BarChart3, TrendingUp, 
  ShieldAlert, History, Lock, Wifi, WifiOff, RefreshCw, Settings, Database, Calendar
} from 'lucide-react';
import { storageService } from '../services/storageService';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  userRole, 
  onOpenAuditLog, 
  onOpenSecurityReport,
  onOpenConfig,
  onOpenBackup,
  onRestrictedClick,
  onLock
}) {
  const [syncStatus, setSyncStatus] = useState(storageService.getSyncStatus());

  useEffect(() => {
    const unsubscribe = storageService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const allTabs = [
    { id: 'invoices', label: 'Facturas', icon: FileText, restricted: false },
    { id: 'clients', label: 'Clientes', icon: Users, restricted: false },
    { id: 'agenda', label: 'Agenda', icon: Calendar, restricted: false, adminOnly: true },
    { id: 'other_income', label: 'Otros Ingresos', icon: DollarSign, restricted: true },
    { id: 'provider_deductions', label: 'Fact Prov', icon: Receipt, restricted: false, adminOnly: true },
    { id: 'expenses', label: 'Gastos & Bancos', icon: CreditCard, restricted: true },
    { id: 'analytics', label: 'Métricas & Analíticas', icon: BarChart3, restricted: true },
    { id: 'investments', label: 'Inversiones & Bot IA', icon: TrendingUp, restricted: true }
  ];

  const tabs = allTabs.filter(t => !t.adminOnly || userRole === 'admin');

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
        {/* Brand Header con Icono Oficial Simétrico */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img 
            src="/app-icon.jpg" 
            alt="Conta Inovatel Icon"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              objectFit: 'cover',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25), 0 0 10px rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          />
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
          {/* Indicador de Sincronización Multidispositivo en Tiempo Real */}
          <button 
            onClick={async () => {
              try {
                await storageService.syncFromSupabase();
              } catch (e) {
                console.error('Manual sync error:', e);
              }
            }}
            title={
              syncStatus === 'ONLINE_REALTIME' 
                ? 'Sincronizado en tiempo real con la nube. Haz clic para forzar resincronización.' 
                : syncStatus === 'RECONNECTING' 
                ? 'Reconectando con la nube...' 
                : 'Modo Offline: Usando caché local. Haz clic para reintentar.'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: syncStatus === 'ONLINE_REALTIME' 
                ? 'rgba(16, 185, 129, 0.1)' 
                : syncStatus === 'RECONNECTING' 
                ? 'rgba(245, 158, 11, 0.1)' 
                : 'rgba(148, 163, 184, 0.15)',
              border: `1px solid ${
                syncStatus === 'ONLINE_REALTIME' 
                  ? 'rgba(16, 185, 129, 0.3)' 
                  : syncStatus === 'RECONNECTING' 
                  ? 'rgba(245, 158, 11, 0.3)' 
                  : 'rgba(148, 163, 184, 0.3)'
              }`,
              color: syncStatus === 'ONLINE_REALTIME' 
                ? '#047857' 
                : syncStatus === 'RECONNECTING' 
                ? '#b45309' 
                : '#475569',
              borderRadius: '9999px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.76rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {syncStatus === 'ONLINE_REALTIME' && (
              <>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
                <Wifi size={13} color="#10b981" />
                <span>Tiempo Real Activo</span>
              </>
            )}
            {syncStatus === 'RECONNECTING' && (
              <>
                <RefreshCw size={13} className="animate-spin" color="#f59e0b" />
                <span>Reconectando...</span>
              </>
            )}
            {syncStatus === 'OFFLINE' && (
              <>
                <WifiOff size={13} color="#64748b" />
                <span>Modo Offline</span>
              </>
            )}
          </button>

          {userRole === 'admin' && (
            <>
              {/* Botón de Configuración Global */}
              <button className="btn-secondary" onClick={onOpenConfig} style={{ fontSize: '0.85rem' }} title="Configuración de Tarjetas y Cuentas">
                <Settings size={16} color="#0284c7" /> Config
              </button>

              {/* Botón de Respaldo & Disaster Recovery */}
              <button className="btn-secondary" onClick={onOpenBackup} style={{ fontSize: '0.85rem' }} title="Copia de Seguridad y Snapshot 1-Clic">
                <Database size={16} color="#0284c7" /> Respaldo
              </button>

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
              <Lock size={14} />
              {userRole === 'admin' ? 'edson' : 'karla'}
            </span>

            {userRole === 'admin' ? (
              <button
                onClick={onLock}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}
                title="Bloquear pantalla de acceso"
              >
                <Lock size={13} /> Bloquear
              </button>
            ) : (
              <button
                onClick={() => onRestrictedClick('Panel de Administración')}
                style={{ background: 'none', border: 'none', color: '#b45309', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}
              >
                <Lock size={13} /> edson
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
              style={{
                opacity: isLockedForUser ? 0.12 : 1,
                filter: isLockedForUser ? 'blur(2.5px)' : 'none',
                userSelect: isLockedForUser ? 'none' : 'auto',
                cursor: isLockedForUser ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
              title={isLockedForUser ? 'Requiere clave de edson' : t.label}
            >
              <Icon size={18} />
              <span>{t.label}</span>
              {isLockedForUser && <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '2px' }}>🔒</span>}
            </button>
          );
        })}
      </div>
    </header>
  );
}
