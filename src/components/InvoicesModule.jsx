import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Trash2, Edit3, CheckCircle, Clock, Calculator, Calendar, RotateCcw, Layers, Percent, Receipt, TrendingUp, Tag, Landmark, ChevronDown, ChevronUp } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatDate, MONTH_NAMES } from '../utils/dateFormatter';
import { formatFolio } from '../utils/folioFormatter';
import { useIsMobile } from '../hooks/useIsMobile';

export default function InvoicesModule({ userRole }) {
  const isMobile = useIsMobile();
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [deductibles, setDeductibles] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [taxConfig, setTaxConfig] = useState({ isrEstimatedRate: 2.5 });

  // Modal Deposit State
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [editingDepositId, setEditingDepositId] = useState(null);
  const [depositFormData, setDepositFormData] = useState({
    concept: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    bankName: 'Santander',
    reference: '',
    appliesEquipmentExpense: false,
    equipmentExpense: '',
    equipmentProvider: ''
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
        isrRate: selected.appliesIsr ? 1.25 : 0
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

  const calculateIsrRetained = (subtotal, discount, appliesIsr) => {
    if (!appliesIsr) return 0.0;
    const baseNeta = getBaseNeta(subtotal, discount);
    return (baseNeta * 0.0125);
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
      folio: formatFolio(formData.folio || ('FK-' + (invoices.length + 101))),
      clientName: formData.clientName,
      rfc: formData.rfc,
      date: formData.date,
      isMixedTax: formData.isMixedTax,
      subtotal8: parseFloat(formData.subtotal8) || 0,
      subtotal16: parseFloat(formData.subtotal16) || 0,
      subtotal,
      discount,
      baseNeta,
      ivaRate: formData.isMixedTax ? 8 : (formData.ivaRate || 8),
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
      folio: formatFolio(inv.folio),
      clientName: inv.clientName,
      rfc: inv.rfc,
      date: inv.date,
      isMixedTax: isMixed,
      discount: disc ? disc.toString() : '',
      subtotal8: inv.subtotal8 ? inv.subtotal8.toString() : '',
      subtotal16: inv.subtotal16 ? inv.subtotal16.toString() : '',
      subtotal: inv.subtotal.toString(),
      ivaRate: inv.ivaRate || (baseNeta > 0 ? (Math.abs(Math.round((inv.ivaTotal / baseNeta) * 100) - 16) <= 2 ? 16 : 8) : 8),
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
    const nextNum = invoices.length > 0
      ? (Math.max(0, ...invoices.map(i => parseInt(i.folio?.replace(/\D/g, '') || '0', 10))) + 1)
      : 101;
    setFormData({
      folio: `FK-${nextNum}`,
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
  };

  const handleGlobalRateChange = (newRate) => {
    const rate = parseFloat(newRate);
    const updatedConfig = { isrEstimatedRate: rate };
    setTaxConfig(updatedConfig);
    storageService.saveTaxConfig(updatedConfig);
  };

  // Filter and sort invoices by selected month & year (Most recent date at the top)
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

  // Filter and sort provider deductibles by selected month & year (Most recent date at the top)
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

  // Filter and sort account deposits (Most recent date at the top)
  const filteredDeposits = useMemo(() => {
    return deposits
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
  }, [deposits, selectedMonth, selectedYear]);

  const totalDepositosBrutos = filteredDeposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const totalGastosEquipos = filteredDeposits.reduce((sum, d) => sum + (d.appliesEquipmentExpense ? (parseFloat(d.equipmentExpense) || 0) : 0), 0);
  const totalUtilidadRealDepositos = filteredDeposits.reduce((sum, d) => {
    const amt = parseFloat(d.amount) || 0;
    const eq = d.appliesEquipmentExpense ? (parseFloat(d.equipmentExpense) || 0) : 0;
    return sum + (d.realUtility !== undefined ? d.realUtility : (amt - eq));
  }, 0);

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositFormData.amount) || 0;
    const appliesEquipmentExpense = !!depositFormData.appliesEquipmentExpense;
    const equipmentExpense = appliesEquipmentExpense ? (parseFloat(depositFormData.equipmentExpense) || 0) : 0;
    const realUtility = parseFloat((amount - equipmentExpense).toFixed(2));

    const depositToSave = {
      id: editingDepositId || undefined,
      concept: depositFormData.concept.trim(),
      amount,
      date: depositFormData.date,
      bankName: depositFormData.bankName,
      reference: depositFormData.reference.trim() || 'SPEI-' + Math.floor(10000 + Math.random() * 90000),
      appliesEquipmentExpense,
      equipmentExpense,
      equipmentProvider: (depositFormData.equipmentProvider || '').trim(),
      realUtility
    };

    const updated = await storageService.saveAccountDeposit(depositToSave, userRole === 'admin' ? 'ADMIN' : 'OPERADOR (2020)');
    setDeposits(updated);
    setShowDepositModal(false);
    resetDepositForm();
  };

  const handleEditDeposit = (dep) => {
    setEditingDepositId(dep.id);
    const eqVal = (dep.equipmentExpense !== undefined && dep.equipmentExpense !== null && dep.equipmentExpense !== '')
      ? dep.equipmentExpense
      : (dep.equipment_expense || '');

    const applies = dep.appliesEquipmentExpense !== undefined && dep.appliesEquipmentExpense !== null
      ? !!dep.appliesEquipmentExpense
      : (dep.applies_equipment_expense !== undefined && dep.applies_equipment_expense !== null
          ? !!dep.applies_equipment_expense
          : ((parseFloat(eqVal) || 0) > 0));

    setDepositFormData({
      concept: dep.concept || '',
      amount: dep.amount ? dep.amount.toString() : '',
      date: dep.date || new Date().toISOString().split('T')[0],
      bankName: dep.bankName || dep.bank_name || 'Santander',
      reference: dep.reference || '',
      appliesEquipmentExpense: applies,
      equipmentExpense: eqVal ? eqVal.toString() : '',
      equipmentProvider: dep.equipmentProvider || dep.equipment_provider || ''
    });
    setShowDepositModal(true);
  };

  const handleDeleteDeposit = async (id) => {
    if (window.confirm('¿Eliminar este registro de transferencia / depósito?')) {
      const updated = await storageService.deleteAccountDeposit(id, userRole === 'admin' ? 'ADMIN' : 'OPERADOR (2020)');
      setDeposits(updated);
    }
  };

  const resetDepositForm = () => {
    setEditingDepositId(null);
    const defaultDate = selectedMonth !== 'ALL' && selectedYear !== 'ALL'
      ? `${selectedYear}-${selectedMonth}-01`
      : new Date().toISOString().split('T')[0];

    setDepositFormData({
      concept: '',
      amount: '',
      date: defaultDate,
      bankName: 'Santander',
      reference: '',
      appliesEquipmentExpense: false,
      equipmentExpense: '',
      equipmentProvider: ''
    });
  };

  // Excel Summary Totals Math calculated on the filtered month view
  const currentIsrRate = taxConfig.isrEstimatedRate !== undefined ? taxConfig.isrEstimatedRate : 2.5;
  
  // Total Ingreso Total: suma exacta de Ingreso Total de todas las facturas capturadas
  const totalIngresoTotal = filteredInvoices.reduce((sum, inv) => {
    const base = inv.baseNeta !== undefined ? inv.baseNeta : (parseFloat(inv.subtotal) || 0) - (parseFloat(inv.discount) || 0);
    const isrRet = inv.appliesIsr !== false ? (inv.isrRetained !== undefined ? inv.isrRetained : (base * 0.0125)) : 0;
    const ivaTot = parseFloat(inv.ivaTotal) || 0;
    const ingTot = inv.total !== undefined ? inv.total : (base + ivaTot - isrRet);
    return sum + ingTot;
  }, 0);

  const totalIvaTrasladado = filteredInvoices.reduce((sum, i) => sum + (parseFloat(i.ivaTotal) || 0), 0);
  
  // Retención ISR calculada con base al Ingreso Total (modificable en Liquidación Fiscal, default 2.5%)
  const totalRetencionIsr = totalIngresoTotal * (currentIsrRate / 100);

  // Utilidad Real (edson): Ingreso Total menos Retención ISR
  const utilidadReal = totalIngresoTotal - totalRetencionIsr;

  // IVA Acreditable Proveedores (para tarjeta de admin)
  const totalIvaAcreditable = filteredDeductibles.reduce((sum, d) => sum + (parseFloat(d.ivaTotal) || 0), 0);

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
              <span style={{ color: '#64748b' }}>Ingreso Total: </span>
              <strong style={{ color: '#334155', fontWeight: '800' }}>
                ${totalIngresoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>IVA Trasladado: </span>
              <strong style={{ color: '#0284c7', fontWeight: '800' }}>
                ${totalIvaTrasladado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Retención ISR: </span>
              <strong style={{ color: '#b45309', fontWeight: '800' }}>
                -${totalRetencionIsr.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Utilidad Real: </span>
              <strong style={{ color: '#15803d', fontWeight: '800' }}>
                ${utilidadReal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* Conditional Rendering: Mobile Touch Cards vs Desktop High Density Table */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2.5rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '20px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                No hay facturas registradas para el período seleccionado.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const base = inv.baseNeta !== undefined ? inv.baseNeta : (inv.subtotal - (inv.discount || 0));
                const isrRetained = inv.appliesIsr ? (inv.isrRetained !== undefined ? inv.isrRetained : (base * 0.0125)) : 0;
                const ingresoTotal = inv.total !== undefined ? inv.total : (base + inv.ivaTotal - isrRetained);
                const isExpanded = expandedInvoiceId === inv.id;

                return (
                  <div key={inv.id} className="mobile-touch-card">
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                          {formatFolio(inv.folio)}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>
                          {formatDate(inv.date)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(inv)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {inv.status === 'PENDIENTE' ? (
                          <span className="badge badge-amber" style={{ fontSize: '0.74rem' }}>
                            <Clock size={12} /> PENDIENTE
                          </span>
                        ) : (
                          <span className="badge badge-emerald" style={{ fontSize: '0.74rem' }}>
                            <CheckCircle size={12} /> PAGADA
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Main Info */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 0.2rem 0' }}>
                        {inv.clientName}
                      </h4>
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.05)', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                        {inv.rfc}
                      </span>
                    </div>

                    {/* Total Amount & Action Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.65rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Total Factura</span>
                        <p style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981', margin: 0, letterSpacing: '-0.02em' }}>
                          ${ingresoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                          className="btn-secondary"
                          style={{ minHeight: '36px', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Detalles
                        </button>
                        <button
                          onClick={() => handleEdit(inv)}
                          style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer' }}
                          title="Editar Factura"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer' }}
                          title="Eliminar Factura"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Breakdown Drawer */}
                    {isExpanded && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Subtotal:</span>
                          <strong style={{ display: 'block', color: '#cbd5e1' }}>${inv.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>IVA Trasladado:</span>
                          <strong style={{ display: 'block', color: '#38bdf8' }}>${inv.ivaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Retención ISR:</span>
                          <strong style={{ display: 'block', color: inv.appliesIsr ? '#fbbf24' : '#94a3b8' }}>
                            {inv.appliesIsr ? `$${isrRetained.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Tasa IVA:</span>
                          <strong style={{ display: 'block', color: '#cbd5e1' }}>{inv.ivaRate ? `${inv.ivaRate}%` : '8%'}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
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
                    const isrRetained = inv.appliesIsr ? (inv.isrRetained !== undefined ? inv.isrRetained : (base * 0.0125)) : 0;
                    const ingresoTotal = inv.total !== undefined ? inv.total : (base + inv.ivaTotal - isrRetained);
                    const isMixed = inv.isMixedTax || (inv.subtotal8 > 0 && inv.subtotal16 > 0);

                    return (
                      <tr key={inv.id} style={{ height: '56px' }}>
                        {/* Folio */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <strong style={{ color: '#047857', fontWeight: '800', fontSize: '0.92rem' }}>
                            {formatFolio(inv.folio)}
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

                        {/* IVA Trasladado con badge de tasa real */}
                        <td style={{ whiteSpace: 'nowrap', color: '#0284c7', fontWeight: '600', textAlign: 'right', fontSize: '0.92rem' }}>
                          ${inv.ivaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          {isMixed ? (
                            <span style={{ fontSize: '0.68rem', background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: '800', marginLeft: '0.35rem' }}>
                              8%+16%
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#64748b', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: '700', marginLeft: '0.3rem' }}>
                              {inv.ivaRate ? `${inv.ivaRate}%` : (base > 0 && Math.round((inv.ivaTotal / base) * 100) >= 14 ? '16%' : '8%')}
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
        )}
      </div>

      {/* Bottom Section: 3 Tarjetas Simétricas en Dashboard (Liquidación Fiscal | Fact Prov | Depósito a Cuenta) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'stretch' }}>
        
        {/* Card 1: Resumen Fiscal con Utilidad Real */}
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

            {/* 1. Ingreso Total */}
            <div className="excel-row" style={{ padding: '0.45rem 0' }}>
              <span style={{ color: '#64748b', fontWeight: '700', fontSize: '0.86rem' }}>Ingreso Total:</span>
              <strong style={{ color: '#047857', fontSize: '0.98rem', fontWeight: '800' }}>
                ${totalIngresoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            {/* 2. IVA Trasladado (ventas) */}
            <div className="excel-row" style={{ padding: '0.45rem 0' }}>
              <span style={{ color: '#64748b', fontWeight: '700', fontSize: '0.86rem' }}>IVA Trasladado (ventas):</span>
              <strong style={{ color: '#0284c7', fontSize: '0.96rem', fontWeight: '800' }}>
                ${totalIvaTrasladado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            {/* 3. Retención ISR */}
            <div className="excel-row" style={{ padding: '0.45rem 0' }}>
              <span style={{ color: '#64748b', fontWeight: '700', fontSize: '0.86rem' }}>Retención ISR ({currentIsrRate}%):</span>
              <strong style={{ color: '#b45309', fontSize: '0.96rem', fontWeight: '800' }}>
                -${totalRetencionIsr.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* 4. Utilidad Real (edson) */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '2px solid #86efac',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            marginTop: '0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <TrendingUp size={16} color="#15803d" /> Utilidad Real (edson):
              </span>
            </div>
            <strong style={{ fontSize: '1.28rem', color: '#15803d', fontWeight: '900' }}>
              ${utilidadReal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Card 2: Tarjeta Facturas Proveedores (IVA Acreditable) - Solo visible para edson / admin */}
        {userRole === 'admin' && (
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
        )}

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

            {/* Listado de Transferencias del Mes con Desglose de Utilidad Real */}
            {filteredDeposits.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  No hay transferencias o depósitos registrados en este período.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '230px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {filteredDeposits.map((dep) => {
                  const depAmount = parseFloat(dep.amount) || 0;
                  const eqExpense = dep.appliesEquipmentExpense ? (parseFloat(dep.equipmentExpense) || 0) : 0;
                  const realUtil = dep.realUtility !== undefined ? dep.realUtility : (depAmount - eqExpense);

                  return (
                    <div
                      key={dep.id}
                      style={{
                        background: '#ffffff',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.83rem' }}>
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <button
                            onClick={() => handleEditDeposit(dep)}
                            style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', padding: '0.2rem' }}
                            title="Editar Depósito"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteDeposit(dep.id)}
                            style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.2rem' }}
                            title="Eliminar Depósito"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Desglose Financiero del Depósito */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8fafc',
                        padding: '0.35rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        border: '1px solid #f1f5f9',
                        flexWrap: 'wrap',
                        gap: '0.3rem'
                      }}>
                        <span style={{ color: '#64748b' }}>
                          Depósito: <strong style={{ color: '#334155' }}>${depAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                        </span>

                        {dep.appliesEquipmentExpense && eqExpense > 0 ? (
                          <span style={{ color: '#0284c7', fontSize: '0.74rem' }}>
                            (-) Equipos: <strong>-${eqExpense.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                            {dep.equipmentProvider ? ` (${dep.equipmentProvider})` : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                            (Sin gasto de equipos)
                          </span>
                        )}

                        <span className="badge badge-emerald" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', fontWeight: '800' }}>
                          💰 Utilidad: ${realUtil.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Total Box Card 3: Desglose Integral de Utilidad Real en Cuenta */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            marginTop: '0.6rem',
            border: '1.5px solid #86efac'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#475569' }}>
              <span>(+) Total Depósitos Recibidos:</span>
              <strong style={{ color: '#0f172a' }}>
                ${totalDepositosBrutos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            {totalGastosEquipos > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#0284c7' }}>
                <span>(-) Total Compra de Equipos:</span>
                <strong>
                  -${totalGastosEquipos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            )}

            <div style={{
              borderTop: '1.5px dashed #86efac',
              paddingTop: '0.35rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <strong style={{ fontSize: '0.85rem', color: '#166534' }}>
                💰 TOTAL UTILIDAD REAL EN CUENTA:
              </strong>
              <strong style={{ fontSize: '1.2rem', color: '#15803d', fontWeight: '900' }}>
                ${totalUtilidadRealDepositos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
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
                      placeholder="Ej: FK-659"
                      value={formData.folio}
                      onChange={(e) => setFormData({ ...formData, folio: e.target.value.toUpperCase() })}
                      onBlur={(e) => setFormData({ ...formData, folio: formatFolio(e.target.value) })}
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
                      <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800', color: '#047857', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>1.25% (Fijo Facturas)</span>
                        <span style={{ fontSize: '0.82rem', color: '#b45309' }}>-${currentIsrAmount.toFixed(2)}</span>
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

      {/* Modal Registrar / Editar Depósito a Cuenta */}
      {showDepositModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Landmark size={20} color="#10b981" /> {editingDepositId ? 'Editar Depósito a Cuenta' : 'Registrar Depósito a Cuenta'}
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
                    placeholder="Ej: Transferencia Cobro Factura FK-665"
                    value={depositFormData.concept}
                    onChange={(e) => setDepositFormData({ ...depositFormData, concept: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#047857' }}>
                      Monto Total Depositado ($):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="$0.00"
                      style={{ fontWeight: '800', color: '#047857', fontSize: '1.05rem' }}
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

                {/* Sección de Gastos para Compra de Equipos / Materiales */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={depositFormData.appliesEquipmentExpense}
                      onChange={(e) => setDepositFormData({ ...depositFormData, appliesEquipmentExpense: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#0284c7', marginTop: '2px' }}
                    />
                    <div>
                      <strong style={{ color: '#0f172a', fontSize: '0.86rem', display: 'block' }}>
                        ¿Se utilizó parte de este depósito para compra de equipos / materiales?
                      </strong>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Resta el costo pagado a proveedores para calcular tu Utilidad Real en cuenta
                      </span>
                    </div>
                  </label>

                  {depositFormData.appliesEquipmentExpense && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: '700', color: '#0284c7', fontSize: '0.8rem' }}>
                            Monto para Compra de Equipos ($):
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            placeholder="$0.00"
                            style={{ fontWeight: '700', color: '#0284c7', borderColor: '#38bdf8' }}
                            value={depositFormData.equipmentExpense}
                            onChange={(e) => setDepositFormData({ ...depositFormData, equipmentExpense: e.target.value })}
                            required={depositFormData.appliesEquipmentExpense}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: '700', color: '#334155', fontSize: '0.8rem' }}>
                            Proveedor / Detalle Equipos:
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ej: SYSCOM (Cámaras)"
                            value={depositFormData.equipmentProvider}
                            onChange={(e) => setDepositFormData({ ...depositFormData, equipmentProvider: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Live preview banner */}
                      <div style={{ background: '#ecfdf5', border: '1px solid #86efac', borderRadius: '8px', padding: '0.6rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#166534' }}>
                          Utilidad Real Estimada de este Depósito:
                        </span>
                        <strong style={{ fontSize: '1.05rem', color: '#15803d', fontWeight: '800' }}>
                          ${Math.max(0, (parseFloat(depositFormData.amount) || 0) - (parseFloat(depositFormData.equipmentExpense) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowDepositModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  {editingDepositId ? 'Actualizar Depósito' : 'Guardar Depósito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
