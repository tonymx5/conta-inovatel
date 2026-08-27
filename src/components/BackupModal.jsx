import React, { useState } from 'react';
import { 
  X, Download, Upload, Database, ShieldCheck, CheckCircle2, 
  AlertTriangle, RefreshCw, HardDrive
} from 'lucide-react';
import { storageService } from '../services/storageService';

export default function BackupModal({ isOpen, onClose, userRole = 'admin' }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  if (!isOpen) return null;

  // Estadísticas actuales en el sistema
  const invoicesCount = (storageService.getInvoices ? storageService.getInvoices() : []).length;
  const clientsCount = (storageService.getClients ? storageService.getClients() : []).length;
  const deductiblesCount = (storageService.getDeductibles ? storageService.getDeductibles() : (storageService.getDeductibleExpenses ? storageService.getDeductibleExpenses() : [])).length;
  const depositsCount = (storageService.getAccountDeposits ? storageService.getAccountDeposits() : []).length;
  const cardExpensesCount = (storageService.getCardExpenses ? storageService.getCardExpenses() : []).length;
  const investmentsCount = (storageService.getInvestments ? storageService.getInvestments() : []).length;
  const agendaCount = (storageService.getAgendaEvents ? storageService.getAgendaEvents() : []).length;

  const handleExport = () => {
    setIsExporting(true);
    setExportSuccess(false);
    setTimeout(() => {
      const ok = storageService.exportFullBackup();
      setIsExporting(false);
      if (ok) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 4000);
      }
    }, 400);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && typeof parsed === 'object') {
          setFilePreview({
            date: parsed.metadata?.exportDate || 'Desconocida',
            invoices: Array.isArray(parsed.invoices) ? parsed.invoices.length : 0,
            clients: Array.isArray(parsed.clients) ? parsed.clients.length : 0,
            deductibles: Array.isArray(parsed.deductibles) ? parsed.deductibles.length : 0,
            deposits: Array.isArray(parsed.accountDeposits) ? parsed.accountDeposits.length : 0,
            cards: Array.isArray(parsed.cardExpenses) ? parsed.cardExpenses.length : 0,
            investments: Array.isArray(parsed.investments) ? parsed.investments.length : 0,
            agenda: Array.isArray(parsed.agendaEvents) ? parsed.agendaEvents.length : 0,
            raw: parsed
          });
        } else {
          setImportStatus({ success: false, message: 'El archivo no contiene un formato JSON de respaldo válido.' });
        }
      } catch {
        setImportStatus({ success: false, message: 'Error de sintaxis JSON en el archivo seleccionado.' });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!filePreview || !filePreview.raw) return;

    if (!window.confirm('¿Confirmas que deseas restaurar este respaldo? Los registros se sincronizarán con Supabase y la memoria local.')) {
      return;
    }

    setIsImporting(true);
    setImportStatus(null);

    try {
      const res = await storageService.importFullBackup(filePreview.raw, userRole === 'admin' ? 'ADMIN' : 'KARLA');
      setIsImporting(false);
      if (res.success) {
        setImportStatus({ success: true, message: '¡Respaldo restaurado y sincronizado con éxito!' });
        setSelectedFile(null);
        setFilePreview(null);
      } else {
        setImportStatus({ success: false, message: res.error || 'Error al restaurar los datos.' });
      }
    } catch (e) {
      setIsImporting(false);
      setImportStatus({ success: false, message: e.message });
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content glass-card" style={{ maxWidth: '640px', width: '92%', borderRadius: '20px', padding: '1.75rem', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', padding: '0.55rem', borderRadius: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Copia de Seguridad & Snapshot
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Disaster Recovery Contable & Respaldo en 1-Clic
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn-icon"
            style={{ background: 'rgba(241, 245, 249, 0.8)', border: 'none', borderRadius: '50%', padding: '0.45rem', cursor: 'pointer' }}
          >
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Resumen de Datos Actuales en Sistema */}
        <div style={{ background: 'rgba(248, 250, 252, 0.8)', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '14px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', color: '#334155', fontWeight: '700', fontSize: '0.82rem' }}>
            <HardDrive size={15} color="#0284c7" />
            <span>Inventario Actual en Base de Datos:</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.78rem' }}>
            <div style={{ background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Facturas:</span> <b style={{ color: '#0f172a' }}>{invoicesCount}</b>
            </div>
            <div style={{ background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Clientes:</span> <b style={{ color: '#0f172a' }}>{clientsCount}</b>
            </div>
            <div style={{ background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Deducibles:</span> <b style={{ color: '#0f172a' }}>{deductiblesCount}</b>
            </div>
            <div style={{ background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Depósitos:</span> <b style={{ color: '#0f172a' }}>{depositsCount}</b>
            </div>
            <div style={{ background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Tarjetas:</span> <b style={{ color: '#0f172a' }}>{cardExpensesCount}</b>
            </div>
            <div style={{ background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Inversiones:</span> <b style={{ color: '#0f172a' }}>{investmentsCount}</b>
            </div>
            <div style={{ background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Agenda:</span> <b style={{ color: '#004ac6' }}>{agendaCount}</b>
            </div>
          </div>
        </div>

        {/* Sección 1: Exportar Respaldo en 1-Clic */}
        <div style={{ border: '1px solid rgba(14, 165, 233, 0.25)', background: 'rgba(240, 249, 255, 0.6)', borderRadius: '16px', padding: '1.1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0369a1', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Download size={16} /> 1. Descargar Snapshot Completo (JSON)
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#0284c7', margin: '0.2rem 0 0 0' }}>
                Genera un archivo JSON con todas las tablas de datos para resguardo físico seguro.
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                padding: '0.6rem 1.1rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}
            >
              {isExporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
              <span>{isExporting ? 'Generando...' : 'Descargar Snapshot'}</span>
            </button>
          </div>

          {exportSuccess && (
            <div style={{ marginTop: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#065f46', padding: '0.45rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={15} color="#10b981" />
              <span>¡Archivo de respaldo generado y descargado exitosamente en tu navegador!</span>
            </div>
          )}
        </div>

        {/* Sección 2: Restaurar desde Respaldo */}
        <div style={{ border: '1px solid rgba(203, 213, 225, 0.8)', background: '#fff', borderRadius: '16px', padding: '1.1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Upload size={16} color="#475569" /> 2. Restaurar Snapshot desde Archivo
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.8rem 0' }}>
            Importa un archivo `.json` de respaldo previamente exportado para recuperar o migrar datos.
          </p>

          <input 
            type="file" 
            accept=".json" 
            onChange={handleFileChange}
            id="backup-file-input"
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label 
              htmlFor="backup-file-input" 
              className="btn-secondary"
              style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                padding: '0.55rem 0.9rem'
              }}
            >
              <Upload size={14} />
              <span>{selectedFile ? selectedFile.name : 'Seleccionar Archivo JSON'}</span>
            </label>

            {filePreview && (
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.55rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {isImporting ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                <span>{isImporting ? 'Restaurando...' : 'Confirmar & Restaurar'}</span>
              </button>
            )}
          </div>

          {/* Previsualización del archivo cargado */}
          {filePreview && (
            <div style={{ marginTop: '0.85rem', background: 'rgba(241, 245, 249, 0.7)', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.65rem 0.85rem', fontSize: '0.76rem' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '0.3rem' }}>
                📋 Resumen del archivo seleccionado:
              </div>
              <div style={{ color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <span>📅 Fecha: <b>{filePreview.date}</b></span>
                <span>📑 Facturas: <b>{filePreview.invoices}</b></span>
                <span>👥 Clientes: <b>{filePreview.clients}</b></span>
                <span>🧾 Deducibles: <b>{filePreview.deductibles}</b></span>
                <span>💳 Depósitos: <b>{filePreview.deposits}</b></span>
                <span>🗓️ Agenda: <b>{filePreview.agenda || 0}</b></span>
              </div>
            </div>
          )}

          {/* Status Message */}
          {importStatus && (
            <div style={{ 
              marginTop: '0.75rem', 
              background: importStatus.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)', 
              border: `1px solid ${importStatus.success ? '#10b981' : '#ef4444'}`, 
              color: importStatus.success ? '#065f46' : '#991b1b', 
              padding: '0.5rem 0.75rem', 
              borderRadius: '8px', 
              fontSize: '0.78rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem' 
            }}>
              {importStatus.success ? <CheckCircle2 size={15} color="#10b981" /> : <AlertTriangle size={15} color="#ef4444" />}
              <span>{importStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button 
            className="btn-secondary" 
            onClick={onClose}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
