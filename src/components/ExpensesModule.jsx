import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Edit3, Building } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatDate } from '../utils/dateFormatter';

export default function ExpensesModule({ userRole }) {
  const [expenses, setExpenses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);

  // Modal States
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    bankId: '',
    sector: 'Comida'
  });

  const [bankForm, setBankForm] = useState({
    bankName: '',
    type: 'Débito',
    accountNumber: '**** 0000',
    balance: '0'
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
    setExpenses(storageService.getCardExpenses());
    setBankAccounts(storageService.getBankAccounts());
  };

  const handleSaveExpense = (e) => {
    e.preventDefault();
    const bank = bankAccounts.find(b => b.id === expenseForm.bankId);
    const amount = parseFloat(expenseForm.amount) || 0;

    const expenseToSave = {
      id: editingExpenseId || undefined,
      date: expenseForm.date,
      description: expenseForm.description,
      amount,
      bankId: expenseForm.bankId,
      bankName: bank ? `${bank.bankName} (${bank.type})` : 'Tarjeta General',
      sector: expenseForm.sector
    };

    const updated = storageService.saveCardExpense(expenseToSave, userRole === 'admin' ? 'ADMIN' : 'KARLA');
    setExpenses(updated);
    setShowExpenseModal(false);
    resetExpenseForm();
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      date: expense.date,
      description: expense.description,
      amount: expense.amount.toString(),
      bankId: expense.bankId || (bankAccounts[0]?.id || ''),
      sector: expense.sector || 'Comida'
    });
    setShowExpenseModal(true);
  };

  const handleSaveBank = (e) => {
    e.preventDefault();
    const bankToSave = {
      bankName: bankForm.bankName,
      type: bankForm.type,
      accountNumber: bankForm.accountNumber,
      balance: parseFloat(bankForm.balance) || 0
    };

    const updated = storageService.saveBankAccount(bankToSave);
    setBankAccounts(updated);
    setShowBankModal(false);
    resetBankForm();
  };

  const handleDeleteBank = (id) => {
    if (window.confirm('¿Eliminar esta cuenta / tarjeta bancaria del catálogo?')) {
      const updated = storageService.deleteBankAccount(id);
      setBankAccounts(updated);
    }
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('¿Eliminar este gasto de tarjeta?')) {
      const updated = storageService.deleteCardExpense(id, userRole === 'admin' ? 'ADMIN' : 'KARLA');
      setExpenses(updated);
    }
  };

  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseForm({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      bankId: bankAccounts[0]?.id || '',
      sector: 'Comida'
    });
  };

  const resetBankForm = () => {
    setBankForm({
      bankName: '',
      type: 'Débito',
      accountNumber: '**** 0000',
      balance: '0'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <CreditCard color="#fbbf24" size={24} /> Control de Gastos & Bancos (Tarjetas)
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn-primary" 
            onClick={() => { resetBankForm(); setShowBankModal(true); }}
            style={{ 
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)'
            }}
          >
            <Building size={16} /> Agregar Banco / Tarjeta
          </button>
          <button 
            className="btn-primary" 
            onClick={() => { resetExpenseForm(); setShowExpenseModal(true); }} 
            style={{ 
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)'
            }}
          >
            <Plus size={18} /> Registrar Gasto
          </button>
        </div>
      </div>

      {/* Cards of Registered Banks - Stacked Overlapping 1/4 View */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Bancos y Tarjetas Registradas (Mazo Interactivo)
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.06)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
            Pasa el mouse para expandir (Sobresale 1/4)
          </span>
        </div>

        {bankAccounts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            No hay tarjetas bancarias registradas. Ve al botón <strong>Config</strong> para dar de alta tus tarjetas de débito, crédito o virtuales.
          </div>
        ) : (
          <div className="cards-stack-container" style={{ paddingBottom: bankAccounts.length > 1 ? `${(bankAccounts.length - 1) * 30}px` : '0px' }}>
            <div className="card-group-stack">
              {bankAccounts.map((b, index) => {
                const expensesForBank = expenses.filter(e => e.bankId === b.id).reduce((sum, e) => sum + e.amount, 0);
                const isSelected = selectedCardId === b.id;
                const isOverlap = index > 0;

                return (
                  <div
                    key={b.id}
                    className={`stacked-card-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedCardId(isSelected ? null : b.id)}
                    style={{
                      marginTop: isOverlap ? '-115px' : '0px',
                      zIndex: isSelected ? 90 : index + 1,
                      background: b.type === 'Crédito'
                        ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 60%, #431407 100%)'
                        : b.type === 'Virtual'
                        ? 'linear-gradient(135deg, #3b0764 0%, #0f172a 60%, #1e1b4b 100%)'
                        : 'linear-gradient(135deg, #064e3b 0%, #0f172a 60%, #022c22 100%)',
                      border: `1px solid ${
                        b.type === 'Crédito' ? 'rgba(244, 63, 94, 0.4)' : b.type === 'Virtual' ? 'rgba(192, 132, 252, 0.4)' : 'rgba(16, 185, 129, 0.4)'
                      }`,
                      padding: '1.25rem 1.5rem',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                      minHeight: '170px'
                    }}
                  >
                    {/* Top 1/4 Visible Header Fraction */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className={`badge ${b.type === 'Crédito' ? 'badge-rose' : b.type === 'Virtual' ? 'badge-indigo' : 'badge-emerald'}`} style={{ fontWeight: '800', letterSpacing: '0.05em' }}>
                          {b.type === 'Crédito' ? '🔥 CRÉDITO' : b.type === 'Virtual' ? '⚡ VIRTUAL' : '💳 DÉBITO'}
                        </span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.01em' }}>
                          {b.bankName}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          ({b.accountNumber})
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>
                          Gastos: <strong style={{ color: '#fda4af' }}>${expensesForBank.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                        </span>
                        <button 
                          onClick={(evt) => { evt.stopPropagation(); handleDeleteBank(b.id); }} 
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }} 
                          title="Eliminar Tarjeta"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Fraction Details */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Institución Emitente</span>
                        <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>{b.bankName}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saldo Inicial</span>
                        <p style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981', margin: 0 }}>${(b.balance || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción del Gasto</th>
              <th>Banco / Tarjeta</th>
              <th>Sector / Categoría</th>
              <th>Monto ($ MXN)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No hay gastos registrados. Haz clic en "Registrar Gasto".
                </td>
              </tr>
            ) : (
              [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((e) => (
                <tr key={e.id}>
                  <td style={{ fontSize: '0.88rem', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>
                  <td style={{ fontWeight: '700', color: '#0f172a' }}>{e.description}</td>
                  <td>
                    <span className="badge badge-amber">{e.bankName}</span>
                  </td>
                  <td>
                    <span className="badge badge-indigo">{e.sector}</span>
                  </td>
                  <td style={{ fontWeight: '800', color: '#e11d48' }}>
                    -${e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => handleEditExpense(e)} style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer' }} title="Editar Gasto">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDeleteExpense(e.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }} title="Eliminar Gasto">
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

      {/* Modal Registrar Gasto */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: '700', color: '#f8fafc' }}>
                {editingExpenseId ? 'Editar Gasto con Tarjeta' : 'Registrar Gasto con Tarjeta'}
              </h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSaveExpense}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Fecha del Gasto:</label>
                  <input
                    type="date"
                    className="form-control"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción del Gasto:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Comida ejecutiva, mantenimiento, papelería..."
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Tarjeta / Banco Utilizado:</label>
                    <select
                      className="form-control"
                      value={expenseForm.bankId}
                      onChange={(e) => setExpenseForm({ ...expenseForm, bankId: e.target.value })}
                      required
                    >
                      <option value="">-- Selecciona Tarjeta --</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} ({b.type} - {b.accountNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sector del Gasto:</label>
                    <select
                      className="form-control"
                      value={expenseForm.sector}
                      onChange={(e) => setExpenseForm({ ...expenseForm, sector: e.target.value })}
                    >
                      <option value="Comida">Comida / Alimentos</option>
                      <option value="Ocio">Ocio / Entretenimiento</option>
                      <option value="Servicios">Servicios (Luz, Agua, Net)</option>
                      <option value="Trabajo">Trabajo / Herramientas</option>
                      <option value="Extras">Extras / Imprevistos</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Monto ($ MXN):</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Guardar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Banco */}
      {showBankModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: '700', color: '#f8fafc' }}>Agregar Banco o Tarjeta</h3>
              <button onClick={() => setShowBankModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSaveBank}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nombre de la Institución Bancaria:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Santander, NU, Banregio, Stori, BofA..."
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Tipo de Cuenta:</label>
                    <select
                      className="form-control"
                      value={bankForm.type}
                      onChange={(e) => setBankForm({ ...bankForm, type: e.target.value })}
                    >
                      <option value="Débito">Débito / Nómina</option>
                      <option value="Crédito">Crédito</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Terminación Tarjeta:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="**** 1234"
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowBankModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Tarjeta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
