import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Trash2, Edit3, CheckCircle, Clock, Calculator, Info, Calendar, RotateCcw, Layers, Percent, Receipt, TrendingUp, ArrowDownRight, ShieldCheck, Tag, Landmark, ArrowUpRight, Wallet } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatDate, MONTH_NAMES } from '../utils/dateFormatter';

export default function InvoicesModule({ userRole }) {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [deductibles, setDeductibles] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [taxConfig, setTaxConfig] = useState({ isrEstimatedRate: 1.25 });

  // Modal Deposit State
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositFormData, setDepositFormData] = useState({
    concept: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    bankName: 'Santander',
    reference: ''
  });

  // Real dynamic current system date (Agosto)
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0'); // e.g. '08' (Agosto)
  const currentYearStr = String(now.getFullYear()); // e.g. '2026'

  // Real dynamic current system date (Agosto por defecto)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);

  // Form State (comienza siempre completamente limpio)
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    folio: '',
    clientName: '',
    rfc: '',
    date: new Date().toISOString().split('T')[0],
    isMixedTax: false,
    subtotal: '',
    discount: '',
    subtotal8: '',
    subtotal16: '',
    ivaRate: 8,
    ivaTotal: '',
    appliesIsr: true,
    isrRate: 1.25,
    status: 'PAGADA'
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
    setInvoices(storageService.getInvoices());
    setClients(storageService.getClients());
    setDeductibles(storageService.getDeductibles());
    setDeposits(storageService.getAccountDeposits ? storageService.getAccountDeposits() : []);
    setTaxConfig(storageService.getTaxConfig());
  };

  const handleClientSelect = (clientName) => {
    const selected = clients.find(c => c.name === clientName);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        clientName: selected.name,
        rfc: selected.rfc,
        appliesIsr: selected.appliesIsr,
        isrRate: selected.appliesIsr ? (selected.isrRate || taxConfig.isrEstimatedRate || 1.25) : 0
      }));
    } else {
      setFormData(prev => ({ ...prev, clientName }));
    }
  };

  // Recalculate single rate tax values with discount
  const recalculateSingleTax = (subVal, discVal, rateVal) => {
    const sub = parseFloat(subVal) || 0;
    const disc = parseFloat(discVal) || 0;
    const baseNeta = Math.max(0, sub - disc);
    const rate = parseFloat(rateVal) || 8;
    const iva = (baseNeta * (rate / 100)).toFixed(2);

    return {
      subtotal: subVal,
      discount: discVal,
      ivaTotal: iva
    };
  };

  // Subtotal Input Change
  const handleSubtotalChange = (val) => {
    const updated = recalculateSingleTax(val, formData.discount, formData.ivaRate);
    setFormData(prev => ({
      ...prev,
      ...updated,
      subtotal8: prev.ivaRate === 8 ? val : '',
      subtotal16: prev.ivaRate === 16 ? val : ''
    }));
  };

  // Discount Input Change
  const handleDiscountChange = (val) => {
    const updated = recalculateSingleTax(formData.subtotal, val, formData.ivaRate);
    setFormData(prev => ({
      ...prev,
      ...updated
    }));
  };

  // Iva Rate Change (8% vs 16%)
  const handleIvaRateChange = (newRate) => {
    const r = parseFloat(newRate) || 8;
    setFormData(prev => {
      const updated = recalculateSingleTax(prev.subtotal, prev.discount, r);
      return {
        ...prev,
        ivaRate: r,
        ...updated,
        subtotal8: r === 8 ? prev.subtotal : '',
        subtotal16: r === 16 ? prev.subtotal : ''
      };
    });
  };

  // Mixed Rate Subtotal Changes
  const handleSubtotal8Change = (val) => {
    const s8 = parseFloat(val) || 0;
    const s16 = parseFloat(formData.subtotal16) || 0;
    const totalSub = s8 + s16;
    const disc = parseFloat(formData.discount) || 0;
    const totalSubNeto = Math.max(0, totalSub - disc);
    
    // Proportional or direct mixed tax
    const iva8 = s8 * 0.08;
    const iva16 = s16 * 0.16;
    const totalIva = (iva8 + iva16).toFixed(2);

    setFormData(prev => ({
      ...prev,
      subtotal8: val,
      subtotal: totalSub > 0 ? totalSub.toFixed(2) : '',
      ivaTotal: totalIva
    }));
  };

  const handleSubtotal16Change = (val) => {
    const s8 = parseFloat(formData.subtotal8) || 0;
    const s16 = parseFloat(val) || 0;
    const totalSub = s8 + s16;
    const iva8 = s8 * 0.08;
    const iva16 = s16 * 0.16;
    const totalIva = (iva8 + iva16).toFixed(2);

    setFormData(prev => ({
      ...prev,
      subtotal16: val,
      subtotal: totalSub > 0 ? totalSub.toFixed(2) : '',
      ivaTotal: totalIva
    }));
  };

  const toggleMixedTaxMode = (isMixed) => {
    if (isMixed) {
      const currentSub = parseFloat(formData.subtotal) || 0;
      const s8 = formData.subtotal8 || (formData.ivaRate === 8 ? currentSub.toString() : '');
      const s16 = formData.subtotal16 || (formData.ivaRate === 16 ? currentSub.toString() : '');
      const iva8 = (parseFloat(s8) || 0) * 0.08;
      const iva16 = (parseFloat(s16) || 0) * 0.16;

      setFormData(prev => ({
        ...prev,
        isMixedTax: true,
        subtotal8: s8,
        subtotal16: s16,
        subtotal: currentSub > 0 ? currentSub.toString() : '',
        ivaTotal: (iva8 + iva16).toFixed(2)
      }));
    } else {
      const updated = recalculateSingleTax(formData.subtotal, formData.discount, formData.ivaRate || 8);
      setFormData(prev => ({
        ...prev,
        isMixedTax: false,
        ...updated
      }));
    }
  };

  // Base neta imponible helper
  const getBaseNeta = (sub, disc) => {
    const s = parseFloat(sub) || 0;
    const d = parseFloat(disc) || 0;
    return Math.max(0, s - d);
  };

  const calculateIsrRetained = (subtotal, discount, appliesIsr, isrRate) => {
    if (!appliesIsr) return 0.0;
    const baseNeta = getBaseNeta(subtotal, discount);
    const rate = parseFloat(isrRate) || 1.25;
    return (baseNeta * (rate / 100));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const subtotal = parseFloat(formData.subtotal) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const baseNeta = getBaseNeta(subtotal, discount);
    const ivaTotal = parseFloat(formData.ivaTotal) || 0;
    const isrRetained = calculateIsrRetained(subtotal, discount, formData.appliesIsr, formData.isrRate);
    const total = baseNeta + ivaTotal - isrRetained;

    const invoiceToSave = {
      id: editingId || undefined,
      folio: formData.folio || 'F-' + (invoices.length + 101),
      clientName: formData.clientName,
      rfc: formData.rfc,
      date: formData.date,
      isMixedTax: formData.isMixedTax,
      subtotal8: parseFloat(formData.subtotal8) || 0,
      subtotal16: parseFloat(formData.subtotal16) || 0,
      subtotal,
      discount,
      baseNeta,
      ivaTotal,
      appliesIsr: formData.appliesIsr,
      isrRate: formData.isrRate,
      isrRetained: parseFloat(isrRetained.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      status: formData.status
    };

    const updated = storageService.saveInvoice(invoiceToSave, userRole === 'admin' ? 'ADMIN' : 'OPERADOR (2020)');
    setInvoices(updated);
    setShowModal(false);
    resetForm();
  };

  const handleEdit = (inv) => {
    setEditingId(inv.id);
    const isMixed = !!inv.isMixedTax || (inv.subtotal8 > 0 && inv.subtotal16 > 0);
    const disc = inv.discount || 0;
    const baseNeta = inv.baseNeta || (inv.subtotal - disc);

    setFormData({
      folio: inv.folio,
      clientName: inv.clientName,
      rfc: inv.rfc,
      date: inv.date,
      isMixedTax: isMixed,
      discount: disc ? disc.toString() : '',
      subtotal8: inv.subtotal8 ? inv.subtotal8.toString() : '',
      subtotal16: inv.subtotal16 ? inv.subtotal16.toString() : '',
      subtotal: inv.subtotal.toString(),
      ivaRate: baseNeta > 0 ? Math.round((inv.ivaTotal / baseNeta) * 100) : 8,
      ivaTotal: inv.ivaTotal.toString(),
      appliesIsr: inv.appliesIsr,
      isrRate: inv.isrRate || 1.25,
      status: inv.status
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta factura?')) {
      const updated = storageService.deleteInvoice(id, userRole === 'admin' ? 'ADMIN' : 'OPERADOR (2020)');
      setInvoices(updated);
    }
  };

  const handleToggleStatus = (inv) => {
    const newStatus = inv.status === 'PENDIENTE' ? 'PAGADA' : 'PENDIENTE';
    const updatedInvoice = { ...inv, status: newStatus };
    const updated = storageService.saveInvoice(updatedInvoice, userRole === 'admin' ? 'ADMIN' : 'OPERADOR (2020)');
    setInvoices(updated);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      folio: '',
      clientName: '',
      rfc: '',
      date: new Date().toISOString().split('T')[0],
      isMixedTax: false,
      subtotal: '',
      discount: '',
      subtotal8: '',
      subtotal16: '',
      ivaRate: 8,
      ivaTotal: '',
      appliesIsr: true,
      isrRate: taxConfig.isrEstimatedRate || 1.25,
      status: 'PAGADA'
    });
  };

  const handleGlobalRateChange = (newRate) => {
    const rate = parseFloat(newRate);
    const updatedConfig = { isrEstimatedRate: rate };
    setTaxConfig(updatedConfig);
    storageService.saveTaxConfig(updatedConfig);

    const updatedInvoices = invoices.map(inv => {
      if (inv.appliesIsr) {
        const baseNeta = inv.baseNeta || (inv.subtotal - (inv.discount || 0));
        const isrRetained = parseFloat((baseNeta * (rate / 100)).toFixed(2));
        const total = parseFloat((baseNeta + inv.ivaTotal - isrRetained).toFixed(2));
        return { ...inv, isrRate: rate, isrRetained, total };
      }
      return inv;
    });

    setInvoices(updatedInvoices);
    localStorage.setItem('conta_inovatel_invoices', JSON.stringify(updatedInvoices));
  };

  // Filter invoices by selected month & year
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv.date) return selectedMonth === 'ALL';
      const [year, month] = inv.date.split('-');
      
      const matchesYear = selectedYear === 'ALL' || year === selectedYear;
      const matchesMonth = selectedMonth === 'ALL' || month === selectedMonth;

      return matchesYear && matchesMonth;
    });
  }, [invoices, selectedMonth, selectedYear]);

  // Filter provider deductibles by selected month & year
  const filteredDeductibles = useMemo(() => {
    return deductibles.filter((d) => {
      if (!d.date) return selectedMonth === 'ALL';
      const [year, month] = d.date.split('-');
      
      const matchesYear = selectedYear === 'ALL' || year === selectedYear;
      const matchesMonth = selectedMonth === 'ALL' || month === selectedMonth;

      return matchesYear && matchesMonth;
    });
  }, [deductibles, selectedMonth, selectedYear]);

  // Filter account deposits (transferencias) by selected month & year
  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) => {
      if (!d.date) return selectedMonth === 'ALL';
      const [year, month] = d.date.split('-');
      
      const matchesYear = selectedYear === 'ALL' || year === selectedYear;
      const matchesMonth = selectedMonth === 'ALL' || month === selectedMonth;

      return matchesYear && matchesMonth;
    });
  }, [deposits, selectedMonth, selectedYear]);

  const totalDepositosCuenta = filteredDeposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const handleDepositSubmit = (e) => {
    e.preventDefault();
    const depositToSave = {
      concept: depositFormData.concept.trim(),
      amount: parseFloat(depositFormData.amount) || 0,
      date: depositFormData.date,
      bankName: depositFormData.bankName,
      reference: depositFormData.reference.trim() || 'SPEI-' + Math.floor(10000 + Math.random() * 90000)
    };
    const updated = storageService.saveAccountDeposit(depositToSave, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
    setDeposits(updated);
    setShowDepositModal(false);
    resetDepositForm();
  };

  const handleDeleteDeposit = (id) => {
    if (window.confirm('¿Eliminar este registro de transferencia / depósito?')) {
      const updated = storageService.deleteAccountDeposit(id, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
      setDeposits(updated);
    }
  };

  const resetDepositForm = () => {
    const defaultDate = selectedMonth !== 'ALL' && selectedYear !== 'ALL'
      ? `${selectedYear}-${selectedMonth}-01`
      : new Date().toISOString().split('T')[0];

    setDepositFormData({
      concept: '',
      amount: '',
      date: defaultDate,
      bankName: 'Santander',
      reference: ''
    });
  };

  // Excel Summary Totals Math calculated on the filtered month view
  const currentIsrRate = taxConfig.isrEstimatedRate || 1.25;
  const totalSubtotalesVentas = filteredInvoices.reduce((sum, i) => sum + (i.subtotal || 0), 0);
  const totalDescuentosVentas = filteredInvoices.reduce((sum, i) => sum + (i.discount || 0), 0);
  const totalBaseNetaVentas = totalSubtotalesVentas - totalDescuentosVentas;
  const totalIvaTrasladado = filteredInvoices.reduce((sum, i) => sum + (i.ivaTotal || 0), 0);
  
  const totalRetencionIsr = filteredInvoices.reduce((sum, i) => {
    if (i.appliesIsr) {
      const base = i.baseNeta || (i.subtotal - (i.discount || 0));
      return sum + (i.isrRetained !== undefined ? i.isrRetained : (base * (currentIsrRate / 100)));
    }
    return sum;
  }, 0);

  // Total Ingresos Facturados Cobrados
  const totalIngresosCobrados = filteredInvoices.reduce((sum, i) => {
    const base = i.baseNeta || (i.subtotal - (i.discount || 0));
    const ret = i.appliesIsr ? (i.isrRetained !== undefined ? i.isrRetained : (base * (currentIsrRate / 100))) : 0;
    const tot = i.total !== undefined ? i.total : (base + i.ivaTotal - ret);
    return sum + tot;
  }, 0);

  // IVA Acreditable Proveedores
  const totalIvaAcreditable = filteredDeductibles.reduce((sum, d) => sum + (d.ivaTotal || 0), 0);

  // Liquidación IVA Real a Pagar al SAT (IVA Trasladado - IVA Acreditable)
  const ivaRealPagarSat = Math.max(0, totalIvaTrasladado - totalIvaAcreditable);

  // Utilidad Real: Base Neta de Ventas menos Retención de ISR
  const utilidadReal = totalBaseNetaVentas - totalRetencionIsr;

  const isCurrentMonthSelected = selectedMonth === currentMonthStr && selectedYear === currentYearStr;

  const resetToCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
    setSelectedYear(currentYearStr);
  };

  // Helper values for current form calculation
  const currentBaseNeta = getBaseNeta(formData.subtotal, formData.discount);
  const currentIsrAmount = calculateIsrRetained(formData.subtotal, formData.discount, formData.appliesIsr, formData.isrRate);
  const currentTotalFactura = currentBaseNeta + (parseFloat(formData.ivaTotal) || 0) - currentIsrAmount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '1.35rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText color="#10b981" size={26} /> Facturas
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            Cálculo exacto de Subtotal, Descuentos, Base Gravable, IVA (8%/16%), Retención ISR (1.25%) e Ingreso Total
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} /> Nueva Factura
          </button>
        </div>
      </div>

      {/* Month & Year Filter Bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontWeight: '700', fontSize: '0.9rem' }}>
            <Calendar size={20} color="#10b981" />
            <span>Seleccionar Período:</span>
          </div>

          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Mes:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem 0.8rem', minHeight: '38px', fontWeight: '700', fontSize: '0.88rem', color: '#0f172a', borderColor: '#10b981' }}
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
          Mostrando <strong style={{ color: '#047857' }}>{filteredInvoices.length}</strong> {filteredInvoices.length === 1 ? 'factura' : 'facturas'}
        </div>
      </div>

      {/* Top Full-Width Card: Tabla Completa de Facturas Emitidas */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
              <FileText size={20} color="#10b981" /> Facturas Emitidas (Ventas)
            </h3>
            <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'factura registrada' : 'facturas registradas'}
            </span>
          </div>

          {/* Quick Metrics Bar on top of table */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Subtotal Base: </span>
              <strong style={{ color: '#334155', fontWeight: '800' }}>
                ${totalSubtotalesVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>IVA Trasladado: </span>
              <strong style={{ color: '#0284c7', fontWeight: '800' }}>
                ${totalIvaTrasladado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Total Cobrado: </span>
              <strong style={{ color: '#047857', fontWeight: '800' }}>
                ${totalIngresosCobrados.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* Table of Invoices (Full Width 100%) */}
        <div className="table-container" style={{ margin: 0 }}>
          <table className="custom-table" style={{ width: '100%', minWidth: '920px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '85px', whiteSpace: 'nowrap' }}>Folio</th>
                <th style={{ minWidth: '220px', whiteSpace: 'nowrap' }}>Cliente / RFC</th>
                <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Fecha</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap', textAlign: 'right' }}>Subtotal</th>
                <th style={{ minWidth: '125px', whiteSpace: 'nowrap', textAlign: 'right' }}>IVA Trasladado</th>
                <th style={{ minWidth: '115px', whiteSpace: 'nowrap', textAlign: 'right' }}>Retención ISR</th>
                <th style={{ minWidth: '135px', whiteSpace: 'nowrap', textAlign: 'right' }}>Ingreso Total</th>
                <th style={{ minWidth: '110px', whiteSpace: 'nowrap', textAlign: 'center' }}>Estado</th>
                <th style={{ minWidth: '95px', whiteSpace: 'nowrap', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem' }}>
                    No hay facturas registradas para el período seleccionado ({selectedMonth === 'ALL' ? 'Todos los Meses' : MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} {selectedYear}).
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const base = inv.baseNeta !== undefined ? inv.baseNeta : (inv.subtotal - (inv.discount || 0));
                  const isrRetained = inv.appliesIsr ? (inv.isrRetained !== undefined ? inv.isrRetained : (base * (currentIsrRate / 100))) : 0;
                  const ingresoTotal = inv.total !== undefined ? inv.total : (base + inv.ivaTotal - isrRetained);
                  const isMixed = inv.isMixedTax || (inv.subtotal8 > 0 && inv.subtotal16 > 0);

                  return (
                    <tr key={inv.id} style={{ height: '56px' }}>
                      {/* Folio */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#047857', fontWeight: '800', fontSize: '0.92rem' }}>
                          {inv.folio}
                        </strong>
                      </td>

                      {/* Cliente + RFC on same line */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>{inv.clientName}</span>
                          <span style={{
                            fontSize: '0.72rem',
                            color: '#475569',
                            fontFamily: 'monospace',
                            background: '#f1f5f9',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(203, 213, 225, 0.8)',
                            fontWeight: '600'
                          }}>
                            {inv.rfc}
                          </span>
                        </div>
                      </td>

                      {/* Fecha Formatted DD/Mes/YYYY */}
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.86rem', color: '#334155', fontWeight: '600' }}>
                        {formatDate(inv.date)}
                      </td>

                      {/* Subtotal Base con descuento si aplica */}
                      <td style={{ whiteSpace: 'nowrap', fontWeight: '600', color: '#475569', textAlign: 'right', fontSize: '0.92rem' }}>
                        <div>
                          ${inv.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          {inv.discount > 0 && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#dc2626', fontWeight: '700' }}>
                              -${inv.discount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} desc.
                            </span>
                          )}
                        </div>
                      </td>

                      {/* IVA Trasladado con badge de tasa */}
                      <td style={{ whiteSpace: 'nowrap', color: '#0284c7', fontWeight: '600', textAlign: 'right', fontSize: '0.92rem' }}>
                        ${inv.ivaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        {isMixed ? (
                          <span style={{ fontSize: '0.68rem', background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: '800', marginLeft: '0.35rem' }}>
                            8%+16%
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#64748b', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: '700', marginLeft: '0.3rem' }}>
                            {base > 0 ? `${Math.round((inv.ivaTotal / base) * 100)}%` : '8%'}
                          </span>
                        )}
                      </td>

                      {/* ISR Retenido */}
                      <td style={{ whiteSpace: 'nowrap', color: inv.appliesIsr ? '#b45309' : '#94a3b8', fontWeight: '700', textAlign: 'right', fontSize: '0.92rem' }}>
                        {inv.appliesIsr ? `$${isrRetained.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00'}
                      </td>

                      {/* Ingreso Total */}
                      <td style={{ whiteSpace: 'nowrap', fontWeight: '800', color: '#047857', textAlign: 'right', fontSize: '0.98rem' }}>
                        ${ingresoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Estado (Clickeable con opción PAGADA y PENDIENTE) */}
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(inv)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          title="Clic para cambiar estado (PAGADA / PENDIENTE)"
                        >
                          {inv.status === 'PENDIENTE' ? (
                            <span className="badge badge-amber" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Clock size={13} /> PENDIENTE
                            </span>
                          ) : (
                            <span className="badge badge-emerald" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <CheckCircle size={13} /> PAGADA
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Acción */}
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            onClick={() => handleEdit(inv)}
                            style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px' }}
                            title="Editar Factura"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px' }}
                            title="Eliminar Factura"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: 3 Tarjetas Simétricas en Dashboard (Liquidación Fiscal | Fact Prov | Depósito a Cuenta) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'stretch' }}>
        
        {/* Card 1: Resumen Fiscal & Liquidación de IVA con Utilidad Real */}
        <div className="excel-summary-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', margin: 0, height: '100%' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: '0.65rem' }}>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                  <Calculator size={18} /> Liquidación Fiscal
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                  {selectedMonth === 'ALL' ? 'Todos los Meses' : MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} {selectedYear}
                </span>
              </div>
              
              {/* Tasa Retención ISR */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>
                <span>ISR:</span>
                <select
                  value={currentIsrRate}
                  onChange={(e) => handleGlobalRateChange(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #10b981',
                    color: '#047857',
                    borderRadius: '6px',
                    fontWeight: '800',
                    padding: '0.2rem 0.4rem',
                    cursor: 'pointer',
                    outline: 'none',
                    fontSize: '0.78rem'
                  }}
                >
                  <option value={1.0}>1.0%</option>
                  <option value={1.10}>1.10%</option>
                  <option value={1.25}>1.25%</option>
                  <option value={1.50}>1.50%</option>
                  <option value={2.00}>2.0%</option>
                  <option value={2.50}>2.5%</option>
                </select>
              </div>
            </div>

            {/* Suma de Subtotales */}
            <div className="excel-row" style={{ padding: '0.35rem 0' }}>
              <span style={{ color: '#64748b', fontWeight: '600', fontSize: '0.84rem' }}>Suma de Subtotales:</span>
              <strong style={{ color: '#475569', fontSize: '0.92rem' }}>
                ${totalSubtotalesVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            {/* Descuentos si existen */}
            {totalDescuentosVentas > 0 && (
              <div className="excel-row" style={{ color: '#dc2626', padding: '0.35rem 0' }}>
                <span style={{ fontWeight: '600', fontSize: '0.84rem' }}>(-) Descuentos Aplicados:</span>
                <strong style={{ fontSize: '0.92rem' }}>
                  -${totalDescuentosVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            )}

            {/* IVA Trasladado (Ventas) */}
            <div className="excel-row" style={{ padding: '0.35rem 0' }}>
              <span style={{ color: '#64748b', fontWeight: '600', fontSize: '0.84rem' }}>(+) IVA Trasladado (Ventas):</span>
              <strong style={{ color: '#0284c7', fontSize: '0.92rem' }}>
                ${totalIvaTrasladado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            {/* IVA Acreditable (Proveedores) */}
            <div className="excel-row" style={{ color: '#0891b2', padding: '0.35rem 0' }}>
              <span style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.84rem' }}>
                <ArrowDownRight size={14} /> (-) IVA Acreditable (Proveedores):
              </span>
              <strong style={{ color: '#0891b2', fontSize: '0.92rem' }}>
                -${totalIvaAcreditable.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            {/* IVA Real a Pagar al SAT */}
            <div style={{
              background: 'linear-gradient(135deg, #f0fdfa, #e0f2fe)',
              border: '1.5px solid #67e8f9',
              borderRadius: '10px',
              padding: '0.55rem 0.75rem',
              margin: '0.35rem 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#0e7490', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <ShieldCheck size={15} color="#0891b2" /> IVA REAL A PAGAR SAT:
                </span>
              </div>
              <strong style={{ fontSize: '1.02rem', fontWeight: '800', color: '#0891b2' }}>
                ${ivaRealPagarSat.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            {/* Retención ISR */}
            <div className="excel-row" style={{ padding: '0.35rem 0' }}>
              <span style={{ color: '#64748b', fontWeight: '600', fontSize: '0.84rem' }}>(-) Retención ISR ({currentIsrRate}%):</span>
              <strong style={{ color: '#b45309', fontSize: '0.92rem' }}>
                -${totalRetencionIsr.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Bloque Inferior: UTILIDAD REAL */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '2px solid #86efac',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            marginTop: '0.6rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <TrendingUp size={16} color="#15803d" /> UTILIDAD REAL (Neta):
                </span>
              </div>
              <strong style={{ fontSize: '1.25rem', color: '#15803d', fontWeight: '900' }}>
                ${utilidadReal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            <div style={{
              borderTop: '1px dashed #86efac',
              paddingTop: '0.35rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.74rem',
              color: '#64748b'
            }}>
              <span>Ingreso Total Facturado (con IVA):</span>
              <strong style={{ color: '#047857', fontSize: '0.88rem', fontWeight: '700' }}>
                ${totalIngresosCobrados.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 2: Tarjeta Facturas Proveedores (IVA Acreditable) */}
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1.5px solid #bae6fd', background: '#f8fafc', height: '100%' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem', marginBottom: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <Receipt size={17} color="#0284c7" /> Facturas Proveedores
                </h4>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Acreditamiento de IVA</span>
              </div>
              <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', fontWeight: '700' }}>
                {filteredDeductibles.length} {filteredDeductibles.length === 1 ? 'factura' : 'facturas'}
              </span>
            </div>

            {/* Listado de Facturas Capturadas de Proveedores */}
            {filteredDeductibles.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  No hay facturas de proveedores registradas para este período.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '230px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {filteredDeductibles.map((ded) => (
                  <div
                    key={ded.id}
                    style={{
                      background: '#ffffff',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.82rem' }}>
                        {ded.providerName}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {ded.invoiceNo || 'Sin Folio'} • {formatDate(ded.date)}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block' }}>IVA Acreditable</span>
                      <strong style={{ color: '#0891b2', fontSize: '0.86rem' }}>
                        ${ded.ivaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Box Card 2 */}
          <div style={{
            background: '#e0f2fe',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.6rem',
            border: '1px solid #bae6fd'
          }}>
            <strong style={{ fontSize: '0.82rem', color: '#0369a1' }}>
              TOTAL IVA ACREDITABLE:
            </strong>
            <strong style={{ fontSize: '1.15rem', color: '#0369a1', fontWeight: '900' }}>
              ${totalIvaAcreditable.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Card 3: Tarjeta Depósito a Cuenta (Transferencias Bancarias) */}
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1.5px solid #a7f3d0', background: '#f8fafc', height: '100%' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem', marginBottom: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <Landmark size={17} color="#10b981" /> Depósito a Cuenta
                </h4>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Transferencias Bancarias</span>
              </div>
              <button
                onClick={() => { resetDepositForm(); setShowDepositModal(true); }}
                className="btn-primary"
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', minHeight: '30px', background: 'linear-gradient(135deg, #10b981, #059669)', gap: '0.3rem' }}
              >
                <Plus size={13} /> Registrar
              </button>
            </div>

            {/* Listado de Transferencias del Mes */}
            {filteredDeposits.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  No hay transferencias o depósitos registrados en este período.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '230px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {filteredDeposits.map((dep) => (
                  <div
                    key={dep.id}
                    style={{
                      background: '#ffffff',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.82rem' }}>
                        {dep.concept}
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                        <span style={{ fontSize: '0.68rem', color: '#047857', background: '#ecfdf5', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: '700' }}>
                          {dep.bankName || 'Santander'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {dep.reference ? `${dep.reference} • ` : ''}{formatDate(dep.date)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ color: '#047857', fontSize: '0.88rem', fontWeight: '800' }}>
                        ${(parseFloat(dep.amount) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </strong>
                      <button
                        onClick={() => handleDeleteDeposit(dep.id)}
                        style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.2rem' }}
                        title="Eliminar Depósito"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Box Card 3 */}
          <div style={{
            background: '#dcfce7',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.6rem',
            border: '1px solid #86efac'
          }}>
            <strong style={{ fontSize: '0.82rem', color: '#166534' }}>
              TOTAL DEPÓSITOS A CUENTA:
            </strong>
            <strong style={{ fontSize: '1.15rem', color: '#166534', fontWeight: '900' }}>
              ${totalDepositosCuenta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

      </div>

      {/* Modal Nueva / Editar Factura con Soporte de Descuentos y Tasas Mixtas */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: '800', color: '#0f172a' }}>
                {editingId ? 'Editar Factura' : 'Nueva Factura de Ingreso'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Folio / Serie:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: F-109"
                      value={formData.folio}
                      onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Cliente:</label>
                  <select
                    className="form-control"
                    value={formData.clientName}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    required
                  >
                    <option value="">-- Selecciona o escribe cliente --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.rfc}) - ISR: {c.appliesIsr ? 'SÍ (1.25%)' : 'NO'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">RFC del Cliente:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="RFC del cliente..."
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                  />
                </div>

                {/* Segmented Selector for Tax Mode (Tasa Única vs Tasa Mixta) */}
                <div style={{ background: '#f1f5f9', padding: '0.35rem', borderRadius: '12px', display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => toggleMixedTaxMode(false)}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.8rem',
                      border: 'none',
                      borderRadius: '9px',
                      background: !formData.isMixedTax ? '#ffffff' : 'transparent',
                      color: !formData.isMixedTax ? '#047857' : '#64748b',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: !formData.isMixedTax ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Percent size={15} /> Tasa Única (8% o 16%)
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMixedTaxMode(true)}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.8rem',
                      border: 'none',
                      borderRadius: '9px',
                      background: formData.isMixedTax ? '#ffffff' : 'transparent',
                      color: formData.isMixedTax ? '#0369a1' : '#64748b',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: formData.isMixedTax ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Layers size={15} /> Tasas Mixtas (8% + 16%)
                  </button>
                </div>

                {/* Mode A: Single Rate with Subtotal, Descuentos & IVA */}
                {!formData.isMixedTax ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    {/* Renglón 1: Subtotal e Input de Descuentos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Subtotal (Importe Bruto):</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="Ej: 35720.00"
                          value={formData.subtotal}
                          onChange={(e) => handleSubtotalChange(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Tag size={14} color="#dc2626" /> (-) Descuentos:
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="Ej: 1786.00"
                          style={{ borderColor: formData.discount ? '#fca5a5' : undefined }}
                          value={formData.discount}
                          onChange={(e) => handleDiscountChange(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Renglón 2: Base Imponible Neta & IVA Trasladado */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: '#047857', fontWeight: '700' }}>
                          Base Gravable Neta:
                        </label>
                        <div style={{
                          background: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.75rem 1rem',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          fontWeight: '800',
                          color: '#0f172a',
                          fontSize: '0.95rem'
                        }}>
                          ${currentBaseNeta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label">IVA Trasladado:</label>
                          <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.75rem' }}>
                            <button
                              type="button"
                              onClick={() => handleIvaRateChange(8)}
                              style={{
                                background: formData.ivaRate === 8 ? '#0284c7' : '#e2e8f0',
                                color: formData.ivaRate === 8 ? '#ffffff' : '#475569',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.15rem 0.45rem',
                                cursor: 'pointer',
                                fontWeight: '700'
                              }}
                            >
                              8% (Frontera)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleIvaRateChange(16)}
                              style={{
                                background: formData.ivaRate === 16 ? '#0284c7' : '#e2e8f0',
                                color: formData.ivaRate === 16 ? '#ffffff' : '#475569',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.15rem 0.45rem',
                                cursor: 'pointer',
                                fontWeight: '700'
                              }}
                            >
                              16% (General)
                            </button>
                          </div>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="Monto total IVA..."
                          value={formData.ivaTotal}
                          onChange={(e) => setFormData({ ...formData, ivaTotal: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Mode B: Mixed Rates (8% and 16% on same invoice) */
                  <div style={{ background: 'linear-gradient(145deg, #f0f9ff, #ecfdf5)', padding: '1rem', borderRadius: '14px', border: '1.5px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      {/* Base 8% */}
                      <div className="form-group">
                        <label className="form-label" style={{ color: '#0369a1', fontWeight: '700' }}>
                          Base Gravable al 8%:
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="$0.00"
                          value={formData.subtotal8}
                          onChange={(e) => handleSubtotal8Change(e.target.value)}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '700', marginTop: '0.2rem' }}>
                          IVA 8%: ${((parseFloat(formData.subtotal8) || 0) * 0.08).toFixed(2)}
                        </div>
                      </div>

                      {/* Base 16% */}
                      <div className="form-group">
                        <label className="form-label" style={{ color: '#0369a1', fontWeight: '700' }}>
                          Base Gravable al 16%:
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="$0.00"
                          value={formData.subtotal16}
                          onChange={(e) => handleSubtotal16Change(e.target.value)}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '700', marginTop: '0.2rem' }}>
                          IVA 16%: ${((parseFloat(formData.subtotal16) || 0) * 0.16).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Consolidated Subtotal & Total IVA Preview */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', paddingTop: '0.5rem', borderTop: '1px dashed #bae6fd' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Subtotal Consolidado:</span>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                          ${(parseFloat(formData.subtotal) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>IVA Total Trasladado:</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          style={{ minHeight: '34px', padding: '0.3rem 0.6rem', fontWeight: '800', color: '#0284c7' }}
                          value={formData.ivaTotal}
                          onChange={(e) => setFormData({ ...formData, ivaTotal: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Retención ISR Checkbox */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '700', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.appliesIsr}
                      onChange={(e) => setFormData({ ...formData, appliesIsr: e.target.checked })}
                    />
                    ¿Aplica Retención de ISR para este Cliente?
                  </label>

                  {formData.appliesIsr && (
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label className="form-label">Tasa de Retención ISR:</label>
                      <select
                        className="form-control"
                        value={formData.isrRate}
                        onChange={(e) => setFormData({ ...formData, isrRate: parseFloat(e.target.value) })}
                      >
                        <option value={1.0}>1.0%</option>
                        <option value={1.10}>1.10%</option>
                        <option value={1.25}>1.25% (Default RESICO)</option>
                        <option value={1.50}>1.50%</option>
                        <option value={2.00}>2.0%</option>
                        <option value={2.50}>2.5%</option>
                      </select>
                      <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '0.4rem', fontWeight: '700' }}>
                        Monto Retención ISR (sobre base neta): ${currentIsrAmount.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Estado de la Factura (PAGADA / PENDIENTE) */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#334155' }}>
                    Estado de Cobro de la Factura:
                  </label>
                  <div style={{ background: '#f1f5f9', padding: '0.35rem', borderRadius: '12px', display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'PAGADA' })}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.8rem',
                        border: 'none',
                        borderRadius: '9px',
                        background: formData.status === 'PAGADA' ? '#ffffff' : 'transparent',
                        color: formData.status === 'PAGADA' ? '#047857' : '#64748b',
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        boxShadow: formData.status === 'PAGADA' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <CheckCircle size={15} color={formData.status === 'PAGADA' ? '#10b981' : '#64748b'} /> PAGADA (Pagada)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'PENDIENTE' })}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.8rem',
                        border: 'none',
                        borderRadius: '9px',
                        background: formData.status === 'PENDIENTE' ? '#ffffff' : 'transparent',
                        color: formData.status === 'PENDIENTE' ? '#b45309' : '#64748b',
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        boxShadow: formData.status === 'PENDIENTE' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Clock size={15} color={formData.status === 'PENDIENTE' ? '#f59e0b' : '#64748b'} /> PENDIENTE (Por Pagar)
                    </button>
                  </div>
                </div>

                {/* Live Preview of Ingreso Total matching exact CFDI Breakdown */}
                <div style={{ background: '#ecfdf5', padding: '0.85rem 1.1rem', borderRadius: '12px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#047857', display: 'block' }}>
                      Ingreso Total Cobrado (Total Factura):
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Subtotal (${(parseFloat(formData.subtotal) || 0).toFixed(2)}) {formData.discount ? `- Desc. ($${(parseFloat(formData.discount) || 0).toFixed(2)}) ` : ''}+ IVA (${(parseFloat(formData.ivaTotal) || 0).toFixed(2)}) - Retención ISR (${currentIsrAmount.toFixed(2)})
                    </span>
                  </div>
                  <strong style={{ fontSize: '1.2rem', color: '#047857', fontWeight: '800' }}>
                    ${currentTotalFactura.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Factura</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Depósito a Cuenta */}
      {showDepositModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Landmark size={20} color="#10b981" /> Registrar Depósito a Cuenta
              </h3>
              <button onClick={() => setShowDepositModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleDepositSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#334155' }}>
                    Concepto / Motivo de la Transferencia:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Transferencia Cobro Factura F-109"
                    value={depositFormData.concept}
                    onChange={(e) => setDepositFormData({ ...depositFormData, concept: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#047857' }}>
                      Monto Transferido / Depositado:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="$0.00"
                      style={{ fontWeight: '800', color: '#047857' }}
                      value={depositFormData.amount}
                      onChange={(e) => setDepositFormData({ ...depositFormData, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#334155' }}>
                      Fecha del Depósito:
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={depositFormData.date}
                      onChange={(e) => setDepositFormData({ ...depositFormData, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#334155' }}>
                      Banco / Cuenta Destino:
                    </label>
                    <select
                      className="form-control"
                      value={depositFormData.bankName}
                      onChange={(e) => setDepositFormData({ ...depositFormData, bankName: e.target.value })}
                    >
                      <option value="Santander">Santander</option>
                      <option value="BBVA">BBVA</option>
                      <option value="Banregio">Banregio</option>
                      <option value="NU">NU</option>
                      <option value="Stori">Stori</option>
                      <option value="Bank of America">Bank of America</option>
                      <option value="Mercado Pago">Mercado Pago</option>
                      <option value="Efectivo / Caja">Efectivo / Caja</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#334155' }}>
                      Folio / Referencia SPEI:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: SPEI-99201"
                      value={depositFormData.reference}
                      onChange={(e) => setDepositFormData({ ...depositFormData, reference: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowDepositModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  Guardar Depósito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
