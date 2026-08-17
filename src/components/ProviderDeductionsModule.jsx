import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, UploadCloud, Trash2, Sparkles, Calendar, RotateCcw, ShieldCheck, Tag, Plus, Edit3 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { ocrService } from '../services/ocrService';
import { formatDate, MONTH_NAMES } from '../utils/dateFormatter';

export default function ProviderDeductionsModule({ userRole }) {
  const [deductibles, setDeductibles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');

  // Real dynamic current system date (Agosto)
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0'); // e.g. '08' (Agosto)
  const currentYearStr = String(now.getFullYear()); // e.g. '2026'

  // Real dynamic current system date (Agosto por defecto)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  
  // Modal state (siempre limpio)
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    providerName: '',
    rfc: '',
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
    ivaRate: 16,
    subtotal: '',
    ivaTotal: '',
    total: '',
    sector: 'Trabajo',
    fileName: '',
    fileType: 'pdf'
  });

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };
    window.addEventListener('conta_data_synced', handleSync);
    return () => window.removeEventListener('conta_data_synced', handleSync);
  }, []);

  const loadData = () => {
    setDeductibles(storageService.getDeductibles());
    setInvoices(storageService.getInvoices());
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setOcrStatus('Iniciando lectura digital de documento (PDF / XML / OCR)...');

    const result = await ocrService.scanDocumentOcr(file, (statusText) => setOcrStatus(statusText));
    setIsScanning(false);

    if (result.success) {
      const defaultDate = selectedMonth !== 'ALL' && selectedYear !== 'ALL' 
        ? `${selectedYear}-${selectedMonth}-01` 
        : (result.date || new Date().toISOString().split('T')[0]);

      // Determine detected IVA rate
      let detectedRate = 16;
      if (result.subtotal > 0 && result.ivaTotal > 0) {
        const calculatedRate = Math.round((result.ivaTotal / result.subtotal) * 100);
        if (calculatedRate <= 10) detectedRate = 8;
        else detectedRate = 16;
      }

      setFormData({
        providerName: result.providerName || 'PROVEEDOR DETECTADO',
        rfc: result.rfc || 'XAXX010101000',
        invoiceNo: result.invoiceNo || 'DOC-1001',
        date: result.date || defaultDate,
        ivaRate: detectedRate,
        subtotal: result.subtotal ? result.subtotal.toString() : '',
        ivaTotal: result.ivaTotal ? result.ivaTotal.toString() : '',
        total: result.total ? result.total.toString() : '',
        sector: 'Trabajo',
        fileName: file.name,
        fileType: file.name.endsWith('.xml') ? 'xml' : 'pdf'
      });
      setShowModal(true);
    }
  };

  const handleSubtotalChange = (val, rate = formData.ivaRate) => {
    const sub = parseFloat(val) || 0;
    const iva = sub > 0 ? (sub * (rate / 100)).toFixed(2) : '';
    const tot = sub > 0 ? (sub + parseFloat(iva || 0)).toFixed(2) : '';
    setFormData(prev => ({
      ...prev,
      subtotal: val,
      ivaRate: rate,
      ivaTotal: iva,
      total: tot
    }));
  };

  const handleIvaRateToggle = (rate) => {
    const sub = parseFloat(formData.subtotal) || 0;
    const iva = sub > 0 ? (sub * (rate / 100)).toFixed(2) : '';
    const tot = sub > 0 ? (sub + parseFloat(iva || 0)).toFixed(2) : '';
    setFormData(prev => ({
      ...prev,
      ivaRate: rate,
      ivaTotal: iva,
      total: tot
    }));
  };

  const handleIvaChange = (val) => {
    const sub = parseFloat(formData.subtotal) || 0;
    const iva = parseFloat(val) || 0;
    const tot = (sub + iva).toFixed(2);
    setFormData(prev => ({
      ...prev,
      ivaTotal: val,
      total: tot
    }));
  };

  const handleTotalChange = (val) => {
    const tot = parseFloat(val) || 0;
    const rate = formData.ivaRate || 16;
    const sub = tot > 0 ? (tot / (1 + rate / 100)).toFixed(2) : '';
    const iva = tot > 0 ? (tot - parseFloat(sub || 0)).toFixed(2) : '';
    setFormData(prev => ({
      ...prev,
      total: val,
      subtotal: sub,
      ivaTotal: iva
    }));
  };

  const handleEdit = (d) => {
    setEditingId(d.id);
    const sub = d.subtotal || 0;
    const iva = d.ivaTotal || 0;
    let rate = 16;
    if (sub > 0 && iva > 0) {
      const calculated = Math.round((iva / sub) * 100);
      if (calculated <= 10) rate = 8;
      else rate = 16;
    }

    setFormData({
      providerName: d.providerName || '',
      rfc: d.rfc || '',
      invoiceNo: d.invoiceNo || '',
      date: d.date || new Date().toISOString().split('T')[0],
      ivaRate: rate,
      subtotal: d.subtotal !== undefined ? d.subtotal.toString() : '',
      ivaTotal: d.ivaTotal !== undefined ? d.ivaTotal.toString() : '',
      total: d.total !== undefined ? d.total.toString() : '',
      sector: d.sector || 'Trabajo',
      fileName: d.fileName || '',
      fileType: d.fileType || 'pdf'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const subtotal = parseFloat(formData.subtotal) || 0;
    const ivaTotal = parseFloat(formData.ivaTotal) || 0;
    const total = parseFloat(formData.total) || (subtotal + ivaTotal);

    const itemToSave = {
      id: editingId || undefined,
      providerName: formData.providerName,
      rfc: formData.rfc,
      invoiceNo: formData.invoiceNo,
      date: formData.date,
      subtotal,
      ivaTotal,
      total,
      sector: formData.sector,
      fileName: formData.fileName || 'documento_proveedor.pdf',
      fileType: formData.fileType || 'pdf',
      scannedWithOcr: true
    };

    const updated = await storageService.saveDeductible(itemToSave, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
    setDeductibles(updated);
    setShowModal(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta factura de proveedor?')) {
      const updated = await storageService.deleteDeductible(id, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
      setDeductibles(updated);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    const defaultDate = selectedMonth !== 'ALL' && selectedYear !== 'ALL'
      ? `${selectedYear}-${selectedMonth}-01`
      : new Date().toISOString().split('T')[0];

    setFormData({
      providerName: '',
      rfc: '',
      invoiceNo: '',
      date: defaultDate,
      ivaRate: 16,
      subtotal: '',
      ivaTotal: '',
      total: '',
      sector: 'Trabajo',
      fileName: '',
      fileType: 'pdf'
    });
  };

  // Filter and sort deductibles by selected month & year (Most recent date at the top)
  const filteredDeductibles = useMemo(() => {
    return deductibles
      .filter((d) => {
        if (!d.date) return selectedMonth === 'ALL';
        const [year, month] = d.date.split('-');
        
        const matchesYear = selectedYear === 'ALL' || year === selectedYear;
        const matchesMonth = selectedMonth === 'ALL' || month === selectedMonth;

        return matchesYear && matchesMonth;
      })
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
      });
  }, [deductibles, selectedMonth, selectedYear]);

  // Filter and sort sales invoices for comparing IVA in the selected period (Most recent date at the top)
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (!inv.date) return selectedMonth === 'ALL';
        const [year, month] = inv.date.split('-');
        
        const matchesYear = selectedYear === 'ALL' || year === selectedYear;
        const matchesMonth = selectedMonth === 'ALL' || month === selectedMonth;

        return matchesYear && matchesMonth;
      })
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        return (b.folio || '').localeCompare(a.folio || '', undefined, { numeric: true });
      });
  }, [invoices, selectedMonth, selectedYear]);

  // Period Calculations
  const totalIvaVentas = filteredInvoices.reduce((sum, i) => sum + (i.ivaTotal || 0), 0);
  const totalIvaDeducible = filteredDeductibles.reduce((sum, d) => sum + (d.ivaTotal || 0), 0);

  const ivaNetoPagar = Math.max(0, totalIvaVentas - totalIvaDeducible);
  const ahorroIva = Math.min(totalIvaVentas, totalIvaDeducible);

  const isCurrentMonthSelected = selectedMonth === currentMonthStr && selectedYear === currentYearStr;

  const resetToCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
    setSelectedYear(currentYearStr);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '1.35rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Receipt color="#06b6d4" size={26} /> Fact Prov
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            Control de Facturas de Proveedores, Acreditamiento de IVA & OCR Inteligente
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label className="btn-primary" style={{ background: 'linear-gradient(135deg, #06b6d4, #0284c7)', cursor: 'pointer' }}>
            <UploadCloud size={18} /> Subir PDF / Foto / XML (OCR)
            <input type="file" accept="image/*,application/pdf,.xml" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <button className="btn-secondary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={16} /> Capturar Factura
          </button>
        </div>
      </div>

      {/* Month & Year Filter Bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7', fontWeight: '700', fontSize: '0.9rem' }}>
            <Calendar size={20} color="#06b6d4" />
            <span>Seleccionar Período de Deducción:</span>
          </div>

          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Mes:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem 0.8rem', minHeight: '38px', fontWeight: '700', fontSize: '0.88rem', color: '#0f172a', borderColor: '#06b6d4' }}
            >
              <option value="ALL">Todos los Meses</option>
              {MONTH_NAMES.map((name, idx) => {
                const monthVal = String(idx + 1).padStart(2, '0');
                return (
                  <option key={monthVal} value={monthVal}>
                    {name} {monthVal === currentMonthStr && selectedYear === currentYearStr ? '(Mes en Curso)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Year Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Año:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem 0.8rem', minHeight: '38px', fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}
            >
              <option value="ALL">Todos los Años</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          {/* Status Indicator Badge */}
          {isCurrentMonthSelected ? (
            <span className="badge badge-emerald" style={{ fontSize: '0.78rem' }}>
              ✓ Mes en Curso ({MONTH_NAMES[parseInt(currentMonthStr, 10) - 1]} {currentYearStr})
            </span>
          ) : (
            <button
              onClick={resetToCurrentMonth}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.75rem', minHeight: '36px', fontSize: '0.78rem', gap: '0.35rem' }}
              title="Volver al Mes en Curso"
            >
              <RotateCcw size={13} /> Ir a Mes en Curso ({MONTH_NAMES[parseInt(currentMonthStr, 10) - 1]})
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
          Mostrando <strong style={{ color: '#0284c7' }}>{filteredDeductibles.length}</strong> {filteredDeductibles.length === 1 ? 'comprobante' : 'comprobantes'}
        </div>
      </div>

      {/* OCR Scanning Banner */}
      {isScanning && (
        <div style={{ background: '#cff4fc', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '16px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Sparkles className="animate-pulse-glow" size={24} color="#0284c7" />
          <div>
            <h4 style={{ color: '#0369a1', fontWeight: '800', fontSize: '0.95rem' }}>Procesando Documento con OCR AI...</h4>
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>{ocrStatus}</p>
          </div>
        </div>
      )}

      {/* 4 Soft Tile Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="tile-card tile-card-cyan">
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369a1', display: 'block' }}>IVA TRASLADADO (VENTAS):</span>
          <strong style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: '800' }}>
            ${totalIvaVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </strong>
        </div>

        <div className="tile-card tile-card-mint">
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#047857', display: 'block' }}>(-) IVA DEDUCIBLE (PROVEEDORES):</span>
          <strong style={{ fontSize: '1.35rem', color: '#047857', fontWeight: '800' }}>
            -${totalIvaDeducible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </strong>
        </div>

        <div className="tile-card tile-card-amber">
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b45309', display: 'block' }}>AHORRO FISCAL EN IVA:</span>
          <strong style={{ fontSize: '1.35rem', color: '#b45309', fontWeight: '800' }}>
            ${ahorroIva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </strong>
        </div>

        <div className="tile-card tile-card-rose">
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#be123c', display: 'block' }}>IVA NETO REAL A PAGAR SAT:</span>
          <strong style={{ fontSize: '1.35rem', color: '#be123c', fontWeight: '800' }}>
            ${ivaNetoPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {/* Deductible Invoices Table */}
      <div className="table-container">
        <table className="custom-table" style={{ width: '100%', minWidth: '850px' }}>
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>Proveedor / RFC</th>
              <th style={{ whiteSpace: 'nowrap' }}>Folio / Archivo</th>
              <th style={{ whiteSpace: 'nowrap' }}>Fecha</th>
              <th style={{ whiteSpace: 'nowrap' }}>Sector / Categoría</th>
              <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Subtotal</th>
              <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>IVA Deducible</th>
              <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Total Factura</th>
              <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Origen</th>
              <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeductibles.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem' }}>
                  No hay facturas de proveedores registradas para el período seleccionado ({selectedMonth === 'ALL' ? 'Todos los Meses' : MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} {selectedYear}).
                </td>
              </tr>
            ) : (
              filteredDeductibles.map((d) => (
                <tr key={d.id} style={{ height: '56px' }}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{d.providerName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>{d.rfc}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: '600' }}>{d.invoiceNo || 'S/N'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{d.fileName}</div>
                  </td>
                  <td style={{ fontSize: '0.86rem', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {formatDate(d.date)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>
                      <Tag size={12} /> {d.sector || 'Trabajo'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: '600', color: '#475569', textAlign: 'right' }}>
                    ${d.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: '800', color: '#047857', textAlign: 'right' }}>
                    ${d.ivaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: '700', color: '#0f172a', textAlign: 'right' }}>
                    ${d.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                      <ShieldCheck size={12} /> {d.scannedWithOcr ? 'OCR AI' : 'Manual'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleEdit(d)}
                        style={{
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                          border: '1px solid #a5b4fc',
                          color: '#4338ca',
                          borderRadius: '8px',
                          width: '34px',
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(99, 102, 241, 0.15)',
                          transition: 'all 0.2s ease'
                        }}
                        title="Editar Factura de Proveedor"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        style={{
                          background: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
                          border: '1px solid #fda4af',
                          color: '#e11d48',
                          borderRadius: '8px',
                          width: '34px',
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(244, 63, 94, 0.15)',
                          transition: 'all 0.2s ease'
                        }}
                        title="Eliminar Factura de Proveedor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Captura Manual / Confirmación OCR */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: '800', color: '#0f172a' }}>
                {editingId ? 'Editar Factura de Proveedor' : 'Capturar Factura de Proveedor'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del Proveedor:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Office Depot de México"
                    value={formData.providerName}
                    onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">RFC Proveedor:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: ODE930805B27"
                      value={formData.rfc}
                      onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Folio Factura:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: PDF-9921"
                      value={formData.invoiceNo}
                      onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Fecha de Emisión:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sector del Gasto:</label>
                    <select
                      className="form-control"
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    >
                      <option value="Trabajo">Trabajo / Oficina</option>
                      <option value="Servicios">Servicios (Luz, Internet)</option>
                      <option value="Comida">Comida / Viáticos</option>
                      <option value="Ocio">Ocio / Representación</option>
                      <option value="Extras">Extras / Mantenimiento</option>
                    </select>
                  </div>
                </div>

                {/* Montos e IVA Auto-calculables en 2 columnas sin overflow */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  {/* Subtotal */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#334155' }}>Subtotal (Base):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="$0.00"
                      value={formData.subtotal}
                      onChange={(e) => handleSubtotalChange(e.target.value)}
                      required
                    />
                  </div>

                  {/* Tasa IVA Selector */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#0369a1' }}>Tasa de IVA:</label>
                    <div style={{ display: 'flex', gap: '0.4rem', background: '#e0f2fe', padding: '0.25rem', borderRadius: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleIvaRateToggle(16)}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.6rem',
                          border: 'none',
                          borderRadius: '6px',
                          background: formData.ivaRate === 16 ? '#0284c7' : 'transparent',
                          color: formData.ivaRate === 16 ? '#ffffff' : '#0369a1',
                          fontWeight: '800',
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        16% (General)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleIvaRateToggle(8)}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.6rem',
                          border: 'none',
                          borderRadius: '6px',
                          background: formData.ivaRate === 8 ? '#0284c7' : 'transparent',
                          color: formData.ivaRate === 8 ? '#ffffff' : '#0369a1',
                          fontWeight: '800',
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        8% (Frontera)
                      </button>
                    </div>
                  </div>

                  {/* IVA Deducible */}
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#047857', fontWeight: '700' }}>
                      IVA Deducible ({formData.ivaRate}%):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="$0.00"
                      value={formData.ivaTotal}
                      onChange={(e) => handleIvaChange(e.target.value)}
                      required
                    />
                  </div>

                  {/* Total Factura */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '800', color: '#0f172a' }}>Total Factura:</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="$0.00"
                      style={{ fontWeight: '800', color: '#0f172a' }}
                      value={formData.total}
                      onChange={(e) => handleTotalChange(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Live Preview Calculation */}
                <div style={{ background: '#ecfdf5', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: '600' }}>
                    Cálculo: ${parseFloat(formData.subtotal || 0).toFixed(2)} + IVA ${parseFloat(formData.ivaTotal || 0).toFixed(2)}
                  </span>
                  <strong style={{ fontSize: '1.05rem', color: '#047857', fontWeight: '800' }}>
                    = ${parseFloat(formData.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #06b6d4, #0284c7)' }}>
                  {editingId ? 'Guardar Cambios' : 'Guardar Factura Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
