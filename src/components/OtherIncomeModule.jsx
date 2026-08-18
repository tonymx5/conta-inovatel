import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Edit3, Wallet } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatDate } from '../utils/dateFormatter';

export default function OtherIncomeModule({ userRole }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    concept: '',
    amount: '',
    paymentMethod: 'Efectivo'
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
    setItems(storageService.getOtherIncome());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount) || 0;
    const itemToSave = {
      id: editingId || undefined,
      date: formData.date,
      concept: formData.concept,
      amount,
      paymentMethod: formData.paymentMethod
    };

    const updated = storageService.saveOtherIncome(itemToSave, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
    setItems(updated);
    setShowModal(false);
    resetForm();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      date: item.date,
      concept: item.concept,
      amount: item.amount.toString(),
      paymentMethod: item.paymentMethod
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este registro de otro ingreso?')) {
      const updated = storageService.deleteOtherIncome(id, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
      setItems(updated);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      concept: '',
      amount: '',
      paymentMethod: 'Efectivo'
    });
  };

  const totalOtherIncome = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.35rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <DollarSign color="#10b981" size={26} /> Otros Ingresos
          </h2>
        </div>

        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Capturar Ingreso
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div style={{ gridColumn: 'span 2' }} className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto / Descripción</th>
                <th>Método de Pago</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem' }}>
                    No hay ingresos no facturados registrados.
                  </td>
                </tr>
              ) : (
                [...items].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((i) => (
                  <tr key={i.id}>
                    <td style={{ fontSize: '0.88rem', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>{formatDate(i.date)}</td>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>{i.concept}</td>
                    <td>
                      <span className="badge badge-indigo">
                        {i.paymentMethod}
                      </span>
                    </td>
                    <td style={{ fontWeight: '800', color: '#047857', fontSize: '1rem' }}>
                      ${i.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => handleEdit(i)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }} title="Editar">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDelete(i.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }} title="Eliminar">
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

        <div style={{ gridColumn: 'span 1' }}>
          <div className="tile-card tile-card-mint" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Wallet size={30} color="#10b981" />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#047857' }}>Total Otros Ingresos</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>Flujo de caja complementario</p>
              </div>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.6rem' }}>
              ${totalOtherIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>
              Este capital ingresa al cálculo del bot de inversión y recomendaciones de crecimiento sin afectar las declaraciones fiscales CFDI del SAT.
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: '800', color: '#0f172a' }}>
                {editingId ? 'Editar Otro Ingreso' : 'Registrar Otro Ingreso'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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
                <div className="form-group">
                  <label className="form-label">Concepto / Descripción:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Asesoría técnica en efectivo..."
                    value={formData.concept}
                    onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monto ($ MXN):</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Método de Pago:</label>
                  <select
                    className="form-control"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia Directa</option>
                    <option value="Depósito">Depósito en Ventanilla</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Ingreso</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
