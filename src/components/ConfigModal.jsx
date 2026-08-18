import React, { useState, useEffect } from 'react';
import { Settings, CreditCard, Plus, Trash2, Edit3, Check, X, Download, ShieldCheck } from 'lucide-react';
import { storageService } from '../services/storageService';

export default function ConfigModal({ isOpen, onClose, userRole }) {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [editingCardId, setEditingCardId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [cardForm, setCardForm] = useState({
    bankName: '',
    type: 'Débito',
    accountNumber: '**** ',
    balance: '0'
  });

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = () => {
    setBankAccounts(storageService.getBankAccounts());
  };

  if (!isOpen) return null;

  const handleSaveCard = (e) => {
    e.preventDefault();
    if (!cardForm.bankName.trim()) return;

    const accountToSave = {
      id: editingCardId || undefined,
      bankName: cardForm.bankName.trim(),
      type: cardForm.type,
      accountNumber: cardForm.accountNumber.trim() || '**** 0000',
      balance: parseFloat(cardForm.balance) || 0
    };

    const updated = storageService.saveBankAccount(accountToSave);
    setBankAccounts(updated);
    storageService.logAudit(userRole === 'admin' ? 'ADMIN' : 'USUARIO', editingCardId ? 'EDITAR_TARJETA_CONFIG' : 'CREAR_TARJETA_CONFIG', `${accountToSave.bankName} (${accountToSave.type} - ${accountToSave.accountNumber})`);
    
    resetForm();
  };

  const handleEditCard = (card) => {
    setEditingCardId(card.id);
    setCardForm({
      bankName: card.bankName,
      type: card.type || 'Débito',
      accountNumber: card.accountNumber || '**** ',
      balance: (card.balance || 0).toString()
    });
    setShowAddForm(true);
  };

  const handleDeleteCard = (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar la tarjeta "${name}"?`)) {
      const updated = storageService.deleteBankAccount(id);
      setBankAccounts(updated);
      storageService.logAudit(userRole === 'admin' ? 'ADMIN' : 'USUARIO', 'ELIMINAR_TARJETA_CONFIG', `Tarjeta ${name} (ID ${id})`);
    }
  };

  const resetForm = () => {
    setEditingCardId(null);
    setCardForm({
      bankName: '',
      type: 'Débito',
      accountNumber: '**** ',
      balance: '0'
    });
    setShowAddForm(false);
  };

  const predefinedBanks = ['Santander', 'NU', 'Banregio', 'Stori', 'BBVA', 'Banorte', 'HSBC', 'BofA', 'Amex'];

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '780px', width: '92%', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', padding: '0.6rem', borderRadius: '14px', display: 'flex' }}>
              <Settings size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                Configuración del Sistema
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                Administración centralizada de tarjetas bancarias, cuentas y catálogo fiscal
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '78vh', overflowY: 'auto' }}>
          
          {/* Card Management Section */}
          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <CreditCard size={20} color="#38bdf8" /> Catálogo de Tarjetas y Cuentas Bancarias
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem', margin: 0 }}>
                  Las tarjetas dadas de alta aquí se aplicarán a los egresos del módulo de Gastos & Bancos.
                </p>
              </div>

              {!showAddForm && (
                <button 
                  onClick={() => { resetForm(); setShowAddForm(true); }}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
                >
                  <Plus size={16} /> Nueva Tarjeta
                </button>
              )}
            </div>

            {/* Add / Edit Form */}
            {showAddForm && (
              <form onSubmit={handleSaveCard} style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '16px', padding: '1.1rem', marginBottom: '1.25rem' }}>
                <h5 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#38bdf8', marginBottom: '0.9rem' }}>
                  {editingCardId ? '✏️ Editar Tarjeta' : '➕ Alta de Nueva Tarjeta Bancaria'}
                </h5>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Nombre del Banco / Institución:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Santander, NU, Banregio..."
                      value={cardForm.bankName}
                      onChange={(e) => setCardForm({ ...cardForm, bankName: e.target.value })}
                      required
                      list="bank-suggestions"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <datalist id="bank-suggestions">
                      {predefinedBanks.map(b => <option key={b} value={b} />)}
                    </datalist>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Tipo de Tarjeta:</label>
                    <select
                      className="form-control"
                      value={cardForm.type}
                      onChange={(e) => setCardForm({ ...cardForm, type: e.target.value })}
                      style={{ fontSize: '0.85rem' }}
                    >
                      <option value="Débito">💳 Débito</option>
                      <option value="Crédito">🔥 Crédito</option>
                      <option value="Virtual">⚡ Virtual</option>
                      <option value="Corporativa">🏢 Corporativa</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Últimos 4 Dígitos / Alias:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="**** 8819"
                      value={cardForm.accountNumber}
                      onChange={(e) => setCardForm({ ...cardForm, accountNumber: e.target.value })}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Saldo / Límite Inicial ($ MXN):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="0.00"
                      value={cardForm.balance}
                      onChange={(e) => setCardForm({ ...cardForm, balance: e.target.value })}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
                  <button type="button" onClick={resetForm} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
                    <Check size={16} /> {editingCardId ? 'Guardar Cambios' : 'Registrar Tarjeta'}
                  </button>
                </div>
              </form>
            )}

            {/* List of Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.9rem' }}>
              {bankAccounts.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '1.5rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                  No hay tarjetas dadas de alta. Haz clic en "Nueva Tarjeta".
                </div>
              ) : (
                bankAccounts.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      background: card.type === 'Crédito' 
                        ? 'linear-gradient(135deg, rgba(225, 29, 72, 0.15), rgba(15, 23, 42, 0.8))' 
                        : card.type === 'Virtual' 
                        ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(15, 23, 42, 0.8))'
                        : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.8))',
                      border: `1px solid ${
                        card.type === 'Crédito' ? 'rgba(244, 63, 94, 0.3)' : card.type === 'Virtual' ? 'rgba(192, 132, 252, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                      }`,
                      borderRadius: '14px',
                      padding: '0.9rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          background: card.type === 'Crédito' ? 'rgba(244, 63, 94, 0.2)' : card.type === 'Virtual' ? 'rgba(192, 132, 252, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: card.type === 'Crédito' ? '#fda4af' : card.type === 'Virtual' ? '#e9d5ff' : '#6ee7b7',
                          border: `1px solid ${card.type === 'Crédito' ? 'rgba(244, 63, 94, 0.4)' : card.type === 'Virtual' ? 'rgba(192, 132, 252, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                        }}>
                          {card.type}
                        </span>

                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button onClick={() => handleEditCard(card)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '2px' }} title="Editar Tarjeta">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDeleteCard(card.id, card.bankName)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '2px' }} title="Eliminar Tarjeta">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h5 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', margin: '0.2rem 0' }}>
                        {card.bankName}
                      </h5>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {card.accountNumber}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: '#64748b' }}>Saldo:</span>
                      <strong style={{ color: '#f8fafc' }}>${(card.balance || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Database Backup & Disaster Recovery Section */}
          <div style={{ marginTop: '1.25rem', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '20px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <ShieldCheck size={20} color="#38bdf8" /> Respaldo y Recuperación de Datos (Snapshot)
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem', margin: 0 }}>
                  Descarga una copia de seguridad física completa en formato JSON con todas las facturas, clientes, deducciones, depósitos y gastos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const success = storageService.exportFullBackup();
                  if (success) {
                    alert('✅ Respaldo completo descargado exitosamente en tu dispositivo.');
                  }
                }}
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', fontSize: '0.82rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Download size={16} /> Descargar Respaldo Total
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            Cerrar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
