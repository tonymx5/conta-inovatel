import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, UploadCloud, Trash2, Sparkles, Calendar, RotateCcw, ShieldCheck, Tag, Plus, Edit3, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { storageService } from '../services/storageService';
import { ocrService } from '../services/ocrService';
import { formatDate, MONTH_NAMES } from '../utils/dateFormatter';
import { getInvoiceFinancials } from '../utils/invoicePaymentUtils';
import { buildMonthlyProviderAndIncomeSummary } from '../utils/monthlyForecastUtils';

export default function ProviderDeductionsModule({ userRole }) {
  const [deductibles, setDeductibles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');

  // Real dynamic current system date (Agosto)
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0'); // e.g. '09' (Septiembre)
  const currentYearStr = String(now.getFullYear()); // e.g. '2026'

  // Período activo inteligente: si el mes actual aún no tiene deducciones, abre por defecto el mes previo con datos
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const deds = storageService.getDeductibles();
    const hasCurrentMonth = deds.some(d => d.date && d.date.startsWith(`${currentYearStr}-${currentMonthStr}`));
    if (!hasCurrentMonth) {
      const prevMonthNum = now.getMonth();
      if (prevMonthNum >= 1) {
        const prevMonthStr = String(prevMonthNum).padStart(2, '0');
        const hasPrevMonth = deds.some(d => d.date && d.date.startsWith(`${currentYearStr}-${prevMonthStr}`));
        if (hasPrevMonth) return prevMonthStr;
      }
    }
    return currentMonthStr;
  });
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
    setOcrStatus('Iniciando lectura digital de documento y resguardo seguro (PDF / XML / OCR)...');

    const [result, storageResult] = await Promise.all([
      ocrService.scanDocumentOcr(file, (statusText) => setOcrStatus(statusText)),
      storageService.uploadComprobanteStorage(file).catch(() => ({ success: false }))
    ]);
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
        fileUrl: storageResult?.fileUrl || '',
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
      fileUrl: formData.fileUrl || undefined,
      fileType: formData.fileType || 'pdf',
      scannedWithOcr: true
    };

    const updated = await storageService.saveDeductible(itemToSave, userRole === 'admin' ? 'ADMIN' : 'KARLA');
    setDeductibles(updated);
    setShowModal(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta factura de proveedor?')) {
      const updated = await storageService.deleteDeductible(id, userRole === 'admin' ? 'ADMIN' : 'KARLA');
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

  // Period Calculations (IVA trasladado proporcional a lo efectivamente cobrado)
  const totalIvaVentas = filteredInvoices.reduce((sum, i) => {
    const fin = getInvoiceFinancials(i);
    return sum + fin.collectedIva;
  }, 0);
  const totalIvaDeducible = filteredDeductibles.reduce((sum, d) => sum + (parseFloat(d.ivaTotal) || 0), 0);

  const ivaNetoPagar = Math.max(0, totalIvaVentas - totalIvaDeducible);
  const ahorroIva = Math.min(totalIvaVentas, totalIvaDeducible);

  const monthlySummary = useMemo(
    () => buildMonthlyProviderAndIncomeSummary(invoices, deductibles, selectedYear),
    [invoices, deductibles, selectedYear]
  );

  const formatMoney = (value) =>
    `$${(Number(value) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <Receipt color="#06b6d4" size={26} /> Fact Prov
          </h2>
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

      {/* Vista Lineal Mensual: Totales, Promedios y Estimación de Ingreso del Mes Futuro */}
      <div className="glass-panel" style={{ padding: '1.35rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <TrendingUp size={20} color="#0284c7" />
              Análisis Lineal Mensual y Proyección de Ingresos ({selectedYear === 'ALL' ? 'Histórico Completo' : selectedYear})
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0 0', fontWeight: '500' }}>
              Comparativa mes a mes de ingresos cobrados vs. facturas de proveedores, promedios reales y estimación del próximo mes.
            </p>
          </div>
          <span className="badge badge-indigo" style={{ fontSize: '0.74rem', fontWeight: '700' }}>
            {monthlySummary.averages.activeMonthsCount} {monthlySummary.averages.activeMonthsCount === 1 ? 'mes con registros' : 'meses con registros'}
          </span>
        </div>

        {/* 4 Tarjetas Resumen: Totales, Promedios y Estimación de Ingreso Futuro */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', padding: '0.95rem 1.1rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#047857', display: 'block', textTransform: 'uppercase' }}>
              Total Ingresos Cobrados
            </span>
            <strong style={{ fontSize: '1.3rem', color: '#065f46', fontWeight: '800', display: 'block', margin: '0.2rem 0' }}>
              {formatMoney(monthlySummary.totals.totalIncomeCollected)}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: '600' }}>
              Promedio mensual: <strong>{formatMoney(monthlySummary.averages.avgMonthlyIncome)}</strong> ({monthlySummary.averages.monthsWithIncome}m)
            </span>
          </div>

          <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '14px', padding: '0.95rem 1.1rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0369a1', display: 'block', textTransform: 'uppercase' }}>
              Total Facturas Proveedores
            </span>
            <strong style={{ fontSize: '1.3rem', color: '#0c4a6e', fontWeight: '800', display: 'block', margin: '0.2rem 0' }}>
              {formatMoney(monthlySummary.totals.totalProviderAmount)}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: '600' }}>
              Promedio mensual: <strong>{formatMoney(monthlySummary.averages.avgMonthlyProvider)}</strong> ({monthlySummary.averages.monthsWithProvider}m)
            </span>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.28)', borderRadius: '14px', padding: '0.95rem 1.1rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#b45309', display: 'block', textTransform: 'uppercase' }}>
              Balance Operativo (Ing. - Prov.)
            </span>
            <strong style={{ fontSize: '1.3rem', color: monthlySummary.totals.totalNetBalance >= 0 ? '#92400e' : '#be123c', fontWeight: '800', display: 'block', margin: '0.2rem 0' }}>
              {formatMoney(monthlySummary.totals.totalNetBalance)}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: '600' }}>
              Promedio mensual: <strong>{formatMoney(monthlySummary.averages.avgMonthlyBalance)}</strong>
            </span>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.12))', border: '1px solid rgba(99, 102, 241, 0.35)', borderRadius: '14px', padding: '0.95rem 1.1rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#4338ca', display: 'block', textTransform: 'uppercase' }}>
              Estimación Ingreso {monthlySummary.forecast.targetFullLabel}
            </span>
            <strong style={{ fontSize: '1.35rem', color: '#312e81', fontWeight: '800', display: 'block', margin: '0.2rem 0' }}>
              {formatMoney(monthlySummary.forecast.estimatedIncome)}
            </strong>
            <span style={{ fontSize: '0.71rem', color: '#4338ca', fontWeight: '600', display: 'block', lineHeight: 1.35 }}>
              {monthlySummary.forecast.closedMonthsCount > 0 ? (
                <>
                  Prom. 3M: <strong>{formatMoney(monthlySummary.forecast.movingAvg3M)}</strong> · Tendencia: <strong>{formatMoney(monthlySummary.forecast.linearProjection)}</strong>
                  {' '}({monthlySummary.forecast.slope >= 0 ? '+' : ''}{formatMoney(monthlySummary.forecast.slope)}/mes)
                </>
              ) : (
                monthlySummary.forecast.formulaNote
              )}
            </span>
          </div>
        </div>

        {/* Fórmula Transparente */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.65rem 0.95rem', fontSize: '0.76rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>
            <strong>Fórmula de Estimación:</strong>{' '}
            <code>Ingreso Futuro = 0.5 × Promedio Móvil (últimos 3 meses cerrados) + 0.5 × Tendencia Lineal (mínimos cuadrados)</code>
          </span>
          <span style={{ color: '#4338ca', fontWeight: '700' }}>
            {monthlySummary.forecast.formulaNote}
          </span>
        </div>

        {/* Gráfica Lineal Mensual */}
        {monthlySummary.chartData.length > 0 ? (
          <div style={{ width: '100%', height: '290px', background: 'rgba(255, 255, 255, 0.55)', borderRadius: '14px', padding: '0.85rem 0.5rem 0.25rem 0', border: '1px solid rgba(203, 213, 225, 0.6)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySummary.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.28)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  tickFormatter={(val) => (val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`)}
                />
                <Tooltip
                  formatter={(value, name) => [formatMoney(value), name]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(203, 213, 225, 0.8)',
                    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
                    fontSize: '0.8rem'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.78rem', fontWeight: 700 }} />
                <Line
                  type="monotone"
                  dataKey="Ingresos"
                  name="Ingresos Cobrados"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="Proveedores"
                  name="Facturas Proveedores"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="Proyeccion"
                  name="Ingreso Estimado Futuro"
                  stroke="#6366f1"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  dot={{ r: 5, fill: '#6366f1' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', fontSize: '0.85rem' }}>
            No hay movimientos mensuales registrados para graficar en {selectedYear === 'ALL' ? 'el histórico' : selectedYear}.
          </div>
        )}

        {/* Tabla Lineal Resumen Mensual (Totales y Promedios) */}
        <div className="table-container" style={{ margin: 0 }}>
          <table className="custom-table" style={{ width: '100%', minWidth: '720px' }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Mes</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Ingresos Cobrados</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Fact. Proveedores</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>IVA Deducible</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Balance (Ing. - Prov.)</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary.monthlyRows.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '1.75rem' }}>
                    Sin registros mensuales en {selectedYear === 'ALL' ? 'ningún año' : selectedYear}.
                  </td>
                </tr>
              ) : (
                <>
                  {monthlySummary.monthlyRows.map((row) => {
                    const isSelectedRow = selectedMonth === row.month && (selectedYear === 'ALL' || selectedYear === row.year);
                    return (
                      <tr
                        key={row.key}
                        style={{
                          height: '46px',
                          background: isSelectedRow ? 'rgba(6, 182, 212, 0.08)' : undefined
                        }}
                      >
                        <td style={{ whiteSpace: 'nowrap', fontWeight: '700', color: '#0f172a' }}>
                          {row.fullLabel}
                          {row.isCurrentMonth && (
                            <span className="badge badge-emerald" style={{ fontSize: '0.66rem', marginLeft: '0.45rem' }}>
                              En curso
                            </span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '700', color: '#047857' }}>
                          {formatMoney(row.incomeCollected)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '600', color: '#0369a1' }}>
                          {formatMoney(row.providerTotal)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '600', color: '#0d9488' }}>
                          {formatMoney(row.providerIva)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '700', color: row.netBalance >= 0 ? '#0f172a' : '#be123c' }}>
                          {formatMoney(row.netBalance)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Fila Total Mensual / Acumulado */}
                  <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1', height: '48px' }}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: '800', color: '#0f172a' }}>
                      TOTAL ACUMULADO
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '800', color: '#047857' }}>
                      {formatMoney(monthlySummary.totals.totalIncomeCollected)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '800', color: '#0369a1' }}>
                      {formatMoney(monthlySummary.totals.totalProviderAmount)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '800', color: '#0d9488' }}>
                      {formatMoney(monthlySummary.totals.totalProviderIva)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '800', color: monthlySummary.totals.totalNetBalance >= 0 ? '#0f172a' : '#be123c' }}>
                      {formatMoney(monthlySummary.totals.totalNetBalance)}
                    </td>
                  </tr>

                  {/* Fila Promedio Mensual Real */}
                  <tr style={{ background: '#ecfeff', height: '46px' }}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: '800', color: '#0369a1' }}>
                      PROMEDIO MENSUAL REAL
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '800', color: '#047857' }}>
                      {formatMoney(monthlySummary.averages.avgMonthlyIncome)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '800', color: '#0369a1' }}>
                      {formatMoney(monthlySummary.averages.avgMonthlyProvider)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '800', color: '#0d9488' }}>
                      {formatMoney(monthlySummary.averages.avgMonthlyProviderIva)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: '800', color: monthlySummary.averages.avgMonthlyBalance >= 0 ? '#0f172a' : '#be123c' }}>
                      {formatMoney(monthlySummary.averages.avgMonthlyBalance)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle de Comprobantes Individuales de Proveedores (OCR / Edición / Borrado) */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.02rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Receipt size={18} color="#0284c7" />
            Detalle de Comprobantes de Proveedores ({selectedMonth === 'ALL' ? 'Todos los Meses' : MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} {selectedYear === 'ALL' ? '' : selectedYear})
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
            {filteredDeductibles.length} {filteredDeductibles.length === 1 ? 'comprobante' : 'comprobantes'}
          </span>
        </div>

      {/* Deductible Invoices Table */}
      <div className="table-container" style={{ margin: 0 }}>
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
