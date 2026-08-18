import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Bot, Plus, Trash2, Edit3, Send, Lightbulb, 
  ShieldCheck, Zap, ExternalLink, AlertTriangle 
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatDate } from '../utils/dateFormatter';

export default function InvestmentsModule({ userRole }) {
  const [investments, setInvestments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [deductibles, setDeductibles] = useState([]);
  const [otherIncome, setOtherIncome] = useState([]);
  const [cardExpenses, setCardExpenses] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [taxConfig, setTaxConfig] = useState({ isrEstimatedRate: 1.25 });
  const [editingId, setEditingId] = useState(null);

  // Bot Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: '¡Hola! Soy Inovatel AI, tu Bot Administrador Financiero. He analizado tu Utilidad Real en cuenta bancaria y gastos. ¿Deseas poner en marcha un Plan de Crecimiento del 5% Mensual o revisar recomendaciones de inversión?'
    }
  ]);
  const [userInput, setUserInput] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    assetName: '',
    category: 'Renta Fija',
    amountInvested: '',
    expectedYieldPct: '10.0',
    startDate: new Date().toISOString().split('T')[0]
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
    setInvestments(storageService.getInvestments ? storageService.getInvestments() : []);
    setInvoices(storageService.getInvoices ? storageService.getInvoices() : []);
    setDeductibles(storageService.getDeductibles ? storageService.getDeductibles() : (storageService.getDeductibleExpenses ? storageService.getDeductibleExpenses() : []));
    setOtherIncome(storageService.getOtherIncome ? storageService.getOtherIncome() : []);
    setCardExpenses(storageService.getCardExpenses ? storageService.getCardExpenses() : []);
    setDeposits(storageService.getAccountDeposits ? storageService.getAccountDeposits() : []);
    setTaxConfig(storageService.getTaxConfig ? storageService.getTaxConfig() : { isrEstimatedRate: 1.25 });
  };

  const totalIngresoFacturado = invoices.reduce((sum, i) => sum + (i.total !== undefined ? i.total : (i.subtotal || 0)), 0);
  const totalOtroIngreso = otherIncome.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalIngresos = totalIngresoFacturado + totalOtroIngreso;

  // Utilidad Real en Cuenta Bancaria (Exclusivo Edson / Depósitos menos compra de equipos)
  const edsonDeposits = deposits.filter(d => d.profile === 'edson');
  const totalUtilidadRealDepositos = edsonDeposits.reduce((sum, d) => {
    const amt = parseFloat(d.amount) || 0;
    const eq = d.appliesEquipmentExpense ? (parseFloat(d.equipmentExpense) || 0) : 0;
    return sum + (d.realUtility !== undefined ? d.realUtility : (amt - eq));
  }, 0);

  const baseCalculoUtilidad = totalUtilidadRealDepositos > 0 ? totalUtilidadRealDepositos : totalIngresos;
  const totalGastos = cardExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const flujoLibre = Math.max(0, baseCalculoUtilidad - totalGastos);

  // Cálculo de Reserva SAT (Día 17)
  const totalIvaFacturado = invoices.reduce((sum, i) => sum + (parseFloat(i.ivaTotal) || 0), 0);
  const totalIvaDeducible = deductibles.reduce((sum, d) => sum + (parseFloat(d.ivaTotal) || 0), 0);
  const ivaNetoSat = Math.max(0, totalIvaFacturado - totalIvaDeducible);

  const totalSubtotal = invoices.reduce((sum, i) => sum + (parseFloat(i.subtotal) || 0), 0);
  const totalIsrRetenido = invoices.reduce((sum, i) => sum + (parseFloat(i.isrRetained) || 0), 0);
  const isrEstimadoBruto = totalSubtotal * ((parseFloat(taxConfig.isrEstimatedRate) || 1.25) / 100);
  const isrEstimadoSat = Math.max(0, isrEstimadoBruto - totalIsrRetenido);
  const totalReservaSat = parseFloat((ivaNetoSat + isrEstimadoSat).toFixed(2));
  const isReservaSatCubierta = baseCalculoUtilidad >= totalReservaSat;

  const recomendacionInversionMin = flujoLibre * 0.10;
  const recomendacionInversionMax = flujoLibre * 0.20;

  const totalInvertidoActual = investments.reduce((sum, i) => sum + (i.amountInvested || 0), 0);

  const handleQuickInvest = (pct, suggestedName, suggestedRate) => {
    const amt = (flujoLibre * (pct / 100)).toFixed(2);
    setEditingId(null);
    setFormData({
      assetName: suggestedName,
      category: 'Renta Fija',
      amountInvested: amt > 0 ? amt : '1000',
      expectedYieldPct: suggestedRate || '11.0',
      startDate: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const itemToSave = {
      id: editingId || undefined,
      assetName: formData.assetName,
      category: formData.category,
      amountInvested: parseFloat(formData.amountInvested) || 0,
      expectedYieldPct: parseFloat(formData.expectedYieldPct) || 0,
      startDate: formData.startDate
    };

    const updated = storageService.saveInvestment(itemToSave, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
    setInvestments(updated);
    setShowModal(false);
    resetForm();
  };

  const handleEdit = (inv) => {
    setEditingId(inv.id);
    setFormData({
      assetName: inv.assetName,
      category: inv.category || 'Renta Fija',
      amountInvested: inv.amountInvested.toString(),
      expectedYieldPct: inv.expectedYieldPct !== undefined ? inv.expectedYieldPct.toString() : '10.0',
      startDate: inv.startDate || new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este registro de inversión?')) {
      const updated = storageService.deleteInvestment(id, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
      setInvestments(updated);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      assetName: '',
      category: 'Renta Fija',
      amountInvested: '',
      expectedYieldPct: '10.0',
      startDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userText = userInput.trim();
    const newMessages = [...chatMessages, { sender: 'user', text: userText }];
    setChatMessages(newMessages);
    setUserInput('');

    setTimeout(() => {
      let botReply = '';
      const lower = userText.toLowerCase();

      if (lower.includes('crecimiento') || lower.includes('5%') || lower.includes('plan')) {
        const metaIngresoProximoMes = totalIngresos * 1.05;
        botReply = `🚀 **Plan de Crecimiento del 5% Mensual:**
1. Tu ingreso actual es de $${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}. La meta para el próximo mes es de **$${metaIngresoProximoMes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}** (+$${(totalIngresos * 0.05).toFixed(2)}).
2. Para lograrlo, sugiero separar **$${recomendacionInversionMin.toFixed(2)}** (10% del flujo libre) e invertirlo en optimización de herramientas o proyectos.
3. Tus gastos en el sector de Ocio representan un porcentaje que podemos optimizar en un 2% para reinvertir.`;
      } else if (lower.includes('ahorro') || lower.includes('gasto')) {
        botReply = `💡 **Análisis de Gastos & Ahorro:**
Tienes un total de gastos de **$${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}**. Tu flujo libre es de $${flujoLibre.toLocaleString('es-MX', { minimumFractionDigits: 2 })}. Te recomiendo separar $${recomendacionInversionMin.toFixed(2)} a CETES o Renta Fija antes de asignar presupuesto a gastos opcionales.`;
      } else {
        botReply = `🤖 **Resumen Financiero Inovatel AI:**
• Ingresos capturados: $${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
• Gastos totales: $${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
• Inversión activa: $${totalInvertidoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
Te aconsejo destinar entre $${recomendacionInversionMin.toFixed(2)} y $${recomendacionInversionMax.toFixed(2)} este mes a tu portafolio de inversión.`;
      }

      setChatMessages([...newMessages, { sender: 'bot', text: botReply }]);
    }, 600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner */}
      <div className="glass-panel" style={{ padding: '1.35rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <TrendingUp color="#10b981" size={26} /> Portafolio de Inversiones & Bot IA "Inovatel AI"
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            Administrador inteligente de finanzas para separar del 10% al 20% e impulsar metas de crecimiento del 5% mensual
          </p>
        </div>

        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Nueva Inversión
        </button>
      </div>

      {/* Recommended Investment Surplus & SAT Reserve Cards */}
      <div className="tile-card tile-card-mint" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Lightbulb size={26} color="#10b981" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#047857', margin: 0 }}>
              Oportunidad de Inversión & Protección Fiscal
            </h3>
          </div>

          {/* Badge de Reserva SAT */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: isReservaSatCubierta ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${isReservaSatCubierta ? '#10b981' : '#f59e0b'}`,
            color: isReservaSatCubierta ? '#065f46' : '#b45309',
            padding: '0.35rem 0.8rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: '700'
          }}>
            {isReservaSatCubierta ? <ShieldCheck size={15} color="#10b981" /> : <AlertTriangle size={15} color="#f59e0b" />}
            <span>
              {isReservaSatCubierta 
                ? `🛡️ Reserva SAT Día 17 Cubierta ($${totalReservaSat.toLocaleString('es-MX', { minimumFractionDigits: 2 })})`
                : `⚠️ Reserva SAT Estimada: $${totalReservaSat.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.2rem', fontWeight: '500' }}>
          Con base en tu Utilidad Real en cuenta (<b>${baseCalculoUtilidad.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</b>) y tu flujo libre (<b>${flujoLibre.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</b>), el Bot IA detecta oportunidad de separación para rendimientos pasivos:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.15rem', marginBottom: '1.25rem' }}>
          {/* 10% Conservador */}
          <div className="glass-card" style={{ background: '#ffffff', border: '1px solid rgba(16, 185, 129, 0.25)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>10% SUGERIDO (CONSERVADOR):</span>
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>CETES / Nu</span>
            </div>
            <strong style={{ fontSize: '1.45rem', color: '#047857', fontWeight: '800', display: 'block', margin: '0.3rem 0 0.6rem 0' }}>
              ${recomendacionInversionMin.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
            <button
              onClick={() => handleQuickInvest(10, 'CETES Directo / Renta Fija', '11.0')}
              style={{
                width: '100%',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#047857',
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <Zap size={13} /> <span>Separar 10% en 1-Clic</span>
            </button>
          </div>

          {/* 20% Aceleración */}
          <div className="glass-card" style={{ background: '#ffffff', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>20% (ACELERACIÓN 5%):</span>
              <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>Crecimiento</span>
            </div>
            <strong style={{ fontSize: '1.45rem', color: '#0369a1', fontWeight: '800', display: 'block', margin: '0.3rem 0 0.6rem 0' }}>
              ${recomendacionInversionMax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
            <button
              onClick={() => handleQuickInvest(20, 'Fondo de Crecimiento 5%', '12.5')}
              style={{
                width: '100%',
                background: 'rgba(2, 132, 199, 0.1)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                color: '#0284c7',
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <Zap size={13} /> <span>Separar 20% en 1-Clic</span>
            </button>
          </div>

          {/* Total Invertido */}
          <div className="glass-card" style={{ background: '#ffffff', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', display: 'block' }}>TOTAL INVERTIDO ACTUALMENTE:</span>
            <strong style={{ fontSize: '1.45rem', color: '#b45309', fontWeight: '800', display: 'block', margin: '0.3rem 0 0.6rem 0' }}>
              ${totalInvertidoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
            <div style={{ fontSize: '0.74rem', color: '#78350f', background: 'rgba(245, 158, 11, 0.1)', padding: '0.35rem 0.6rem', borderRadius: '6px', textAlign: 'center', fontWeight: '600' }}>
              {investments.length} activo(s) en cartera
            </div>
          </div>
        </div>

        {/* Portales de Inversión Rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.4rem', borderTop: '1px dashed rgba(16, 185, 129, 0.3)' }}>
          <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: '700' }}>Acceso a Portales Oficiales de Renta Fija:</span>
          <a
            href="https://www.cetesdirecto.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.76rem',
              fontWeight: '700',
              color: '#0369a1',
              background: '#ffffff',
              border: '1px solid #bae6fd',
              padding: '0.3rem 0.7rem',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
            }}
          >
            <span>CETES Directo (~11.0% Anual)</span> <ExternalLink size={12} />
          </a>
          <a
            href="https://nu.com.mx"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.76rem',
              fontWeight: '700',
              color: '#7c3aed',
              background: '#ffffff',
              border: '1px solid #ddd6fe',
              padding: '0.3rem 0.7rem',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
            }}
          >
            <span>Cajitas Nu (~13.0% Anual)</span> <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Main Grid: Investments Table & Bot Interactive Chat */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Left: Investments Table */}
        <div style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Activos e Inversiones Registradas
          </h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Activo / Proyecto</th>
                  <th>Categoría</th>
                  <th>Fecha Inicio</th>
                  <th>Rendimiento Proyectado</th>
                  <th>Monto Invertido</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {investments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                      No hay inversiones registradas.
                    </td>
                  </tr>
                ) : (
                  [...investments].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')).map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: '700', color: '#0f172a' }}>{inv.assetName}</td>
                      <td><span className="badge badge-indigo">{inv.category}</span></td>
                      <td style={{ fontSize: '0.88rem', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>{formatDate(inv.startDate)}</td>
                      <td style={{ color: '#047857', fontWeight: '700' }}>{inv.expectedYieldPct}% Anual</td>
                      <td style={{ fontWeight: '800', color: '#b45309', fontSize: '0.95rem' }}>
                        ${inv.amountInvested.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => handleEdit(inv)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }} title="Editar Inversión">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(inv.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }} title="Eliminar Inversión">
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

        {/* Right: Interactive Bot "Inovatel AI" */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(255, 255, 255, 0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <Bot size={26} color="#06b6d4" />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>Bot "Inovatel AI"</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>Asistente de Finanzas y Plan 5% Mensual</p>
              </div>
            </div>

            {/* Chat History */}
            <div style={{ flex: 1, minHeight: '220px', maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', paddingRight: '0.4rem' }}>
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.sender === 'user' ? 'linear-gradient(135deg, #10b981, #059669)' : '#f1f5f9',
                    color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                    padding: '0.8rem 1.1rem',
                    borderRadius: '16px',
                    fontSize: '0.88rem',
                    fontWeight: '500',
                    maxWidth: '88%',
                    whiteSpace: 'pre-line',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Pregunta sobre tu plan del 5%, ahorro e inversiones..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                style={{ flex: 1, fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1rem' }}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Nueva Inversión */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: '800', color: '#0f172a' }}>
                {editingId ? 'Editar Activo de Inversión' : 'Registrar Activo de Inversión'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del Activo / Proyecto:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: CETES Directo, Fondo PyME, Acciones..."
                    value={formData.assetName}
                    onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Categoría:</label>
                    <select
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Renta Fija">Renta Fija (CETES / Bonos)</option>
                      <option value="Proyectos">Proyectos de Negocio</option>
                      <option value="Renta Variable">Renta Variable / Acciones</option>
                      <option value="Bienes Raíces">Bienes Raíces / Fibras</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de Inicio:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Monto Invertido ($ MXN):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="0.00"
                      value={formData.amountInvested}
                      onChange={(e) => setFormData({ ...formData, amountInvested: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rendimiento Proyectado (%):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={formData.expectedYieldPct}
                      onChange={(e) => setFormData({ ...formData, expectedYieldPct: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Inversión</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
