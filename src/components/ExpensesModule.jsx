import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Edit3, Building } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatDate } from '../utils/dateFormatter';

export default function ExpensesModule({ userRole }) {
  const [expenses, setExpenses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

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

    const updated = storageService.saveCardExpense(expenseToSave, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
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
      const updated = storageService.deleteCardExpense(id, userRole === 'admin' ? 'ADMIN' : 'OPERADOR');
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CreditCard color="#fbbf24" size={24} /> Control de Gastos & Bancos (Tarjetas)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Alta de instituciones bancarias (Santander, NU, Banregio, Stori, BofA) y registro de egresos por tarjeta
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => { resetBankForm(); setShowBankModal(true); }}>
            <Building size={16} /> Agregar Banco / Tarjeta
          </button>
          <button className="btn-primary" onClick={() => { resetExpenseForm(); setShowExpenseModal(true); }} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Plus size={18} /> Registrar Gasto
          </button>
        </div>
      </div>

      {/* Cards of Registered Banks */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Bancos y Tarjetas Registradas
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {bankAccounts.map((b) => {
            const expensesForBank = expenses.filter(e => e.bankId === b.id).reduce((sum, e) => sum + e.amount, 0);
            return (
              <div key={b.id} className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.9))', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className={`badge ${b.type === 'Crédito' ? 'badge-rose' : 'badge-emerald'}`}>
                      {b.type}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{b.accountNumber}</span>
                  </div>
                  <button onClick={() => handleDeleteBank(b.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }} title="Eliminar Tarjeta">
                    <Trash2 size={14} />
                  </button>
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>{b.bankName}</h4>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gastos Acumulados:</span>
                  <strong style={{ color: '#fda4af' }}>${expensesForBank.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            );
          })}
        </div>
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
                  <td style={{ fontWeight: '600', color: '#f8fafc' }}>{e.description}</td>
                  <td>
                    <span className="badge badge-amber">{e.bankName}</span>
                  </td>
                  <td>
                    <span className="badge badge-indigo">{e.sector}</span>
                  </td>
                  <td style={{ fontWeight: '700', color: '#fda4af' }}>
                    -${e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => handleEditExpense(e)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }} title="Editar Gasto">
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
