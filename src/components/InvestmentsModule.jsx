import React, { useState, useEffect } from 'react';
import { TrendingUp, Bot, Plus, Trash2, Send, Lightbulb } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatDate } from '../utils/dateFormatter';

export default function InvestmentsModule({ userRole }) {
  const [investments, setInvestments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [otherIncome, setOtherIncome] = useState([]);
  const [cardExpenses, setCardExpenses] = useState([]);

  // Bot Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: '¡Hola! Soy Inovatel AI, tu Bot Administrador Financiero. He analizado tus ingresos y gastos del mes. ¿Deseas poner en marcha un Plan de Crecimiento del 5% Mensual o revisar recomendaciones de inversión?'
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
    setInvestments(storageService.getInvestments());
    setInvoices(storageService.getInvoices());
    setOtherIncome(storageService.getOtherIncome());
    setCardExpenses(storageService.getCardExpenses());
  };

  const totalIngresoFacturado = invoices.reduce((sum, i) => sum + (i.total !== undefined ? i.total : (i.subtotal || 0)), 0);
  const totalOtroIngreso = otherIncome.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalIngresos = totalIngresoFacturado + totalOtroIngreso;

  const totalGastos = cardExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const flujoLibre = Math.max(0, totalIngresos - totalGastos);

  const recomendacionInversionMin = flujoLibre * 0.10;
  const recomendacionInversionMax = flujoLibre * 0.20;

  const totalInvertidoActual = investments.reduce((sum, i) => sum + (i.amountInvested || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const itemToSave = {
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

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este registro de inversión?')) {
      const updated = storageService.deleteInvestment(id, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
      setInvestments(updated);
    }
  };

  const resetForm = () => {
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

      {/* Recommended Investment Surplus Cards */}
      <div className="tile-card tile-card-mint" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Lightbulb size={26} color="#10b981" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#047857' }}>
            Recomendación Automática de Separación para Inversión
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.2rem', fontWeight: '500' }}>
          Con base en tus ingresos globales ($${totalIngresos.toLocaleString('es-MX')}) y tu flujo libre ($${flujoLibre.toLocaleString('es-MX')}), el sistema sugiere separar:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div className="glass-card" style={{ background: '#ffffff', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', display: 'block' }}>10% SUGERIDO (CONSERVADOR):</span>
            <strong style={{ fontSize: '1.45rem', color: '#047857', fontWeight: '800' }}>
              ${recomendacionInversionMin.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="glass-card" style={{ background: '#ffffff', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', display: 'block' }}>20% SUGERIDO (ACELERACIÓN 5%):</span>
            <strong style={{ fontSize: '1.45rem', color: '#0369a1', fontWeight: '800' }}>
              ${recomendacionInversionMax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="glass-card" style={{ background: '#ffffff', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', display: 'block' }}>TOTAL INVERTIDO ACTUALMENTE:</span>
            <strong style={{ fontSize: '1.45rem', color: '#b45309', fontWeight: '800' }}>
              ${totalInvertidoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
          </div>
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
                  investments.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: '700', color: '#0f172a' }}>{inv.assetName}</td>
                      <td><span className="badge badge-indigo">{inv.category}</span></td>
                      <td style={{ fontSize: '0.88rem', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>{formatDate(inv.startDate)}</td>
                      <td style={{ color: '#047857', fontWeight: '700' }}>{inv.expectedYieldPct}% Anual</td>
                      <td style={{ fontWeight: '800', color: '#b45309', fontSize: '0.95rem' }}>
                        ${inv.amountInvested.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <button onClick={() => handleDelete(inv.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
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
              <h3 style={{ fontWeight: '800', color: '#0f172a' }}>Registrar Activo de Inversión</h3>
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
