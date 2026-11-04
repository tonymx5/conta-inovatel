import React, { useState, useEffect } from 'react';
import { Settings, CreditCard, Plus, Trash2, Edit3, Check, X, Download, ShieldCheck, KeyRound, UserCheck, RefreshCw, Key, ShieldAlert } from 'lucide-react';
import { storageService } from '../services/storageService';
import { securityService } from '../services/securityService';

export default function ConfigModal({ isOpen, onClose, userRole }) {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [editingCardId, setEditingCardId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Estados para Gestión de Accesos & PINs (Admin Only)
  const [karlaCustomPin, setKarlaCustomPin] = useState('');
  const [edsonNewPin, setEdsonNewPin] = useState('');
  const [edsonConfirmPin, setEdsonConfirmPin] = useState('');
  const [newMasterKeyInput, setNewMasterKeyInput] = useState('');
  const [accessStatus, setAccessStatus] = useState(null);
  const [isProcessingAccess, setIsProcessingAccess] = useState(false);

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
    storageService.logAudit(userRole === 'admin' ? 'ADMIN' : 'KARLA', editingCardId ? 'EDITAR_TARJETA_CONFIG' : 'CREAR_TARJETA_CONFIG', `${accountToSave.bankName} (${accountToSave.type} - ${accountToSave.accountNumber})`);
    
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
      storageService.logAudit(userRole === 'admin' ? 'ADMIN' : 'KARLA', 'ELIMINAR_TARJETA_CONFIG', `Tarjeta ${name} (ID ${id})`);
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

  const handleResetKarlaDefault = async () => {
    if (!window.confirm('¿Deseas restablecer el PIN de acceso de Karla al valor inicial seguro (2020)?')) return;
    setIsProcessingAccess(true);
    setAccessStatus(null);
    try {
      const res = await securityService.adminResetUserPin('karla', '2020');
      if (res.success) {
        setAccessStatus({ type: 'success', message: '✅ PIN de Karla restablecido a 2020 exitosamente.' });
      } else {
        setAccessStatus({ type: 'error', message: res.message || 'Error al restablecer PIN de Karla.' });
      }
    } catch {
      setAccessStatus({ type: 'error', message: 'Error de conexión con Supabase.' });
    } finally {
      setIsProcessingAccess(false);
    }
  };

  const handleSaveKarlaCustomPin = async (e) => {
    e.preventDefault();
    if (!karlaCustomPin || karlaCustomPin.trim().length < 4) {
      setAccessStatus({ type: 'error', message: 'El PIN de Karla debe tener al menos 4 caracteres.' });
      return;
    }
    setIsProcessingAccess(true);
    setAccessStatus(null);
    try {
      const res = await securityService.adminResetUserPin('karla', karlaCustomPin.trim());
      if (res.success) {
        setAccessStatus({ type: 'success', message: `✅ PIN de Karla actualizado a "${karlaCustomPin.trim()}" exitosamente.` });
        setKarlaCustomPin('');
      } else {
        setAccessStatus({ type: 'error', message: res.message || 'Error al actualizar PIN de Karla.' });
      }
    } catch {
      setAccessStatus({ type: 'error', message: 'Error de conexión al actualizar PIN.' });
    } finally {
      setIsProcessingAccess(false);
    }
  };

  const handleUpdateEdsonPin = async (e) => {
    e.preventDefault();
    if (edsonNewPin.trim() !== edsonConfirmPin.trim()) {
      setAccessStatus({ type: 'error', message: 'Los campos de PIN de Edson no coinciden.' });
      return;
    }
    if (edsonNewPin.trim().length < 4) {
      setAccessStatus({ type: 'error', message: 'El nuevo PIN de Edson debe tener al menos 4 caracteres.' });
      return;
    }
    setIsProcessingAccess(true);
    setAccessStatus(null);
    try {
      const res = await securityService.adminResetUserPin('edson', edsonNewPin.trim());
      if (res.success) {
        setAccessStatus({ type: 'success', message: '✅ Tu PIN de Administrador (Edson) ha sido actualizado con éxito.' });
        setEdsonNewPin('');
        setEdsonConfirmPin('');
      } else {
        setAccessStatus({ type: 'error', message: res.message || 'Error al actualizar PIN de Edson.' });
      }
    } catch {
      setAccessStatus({ type: 'error', message: 'Error de conexión al actualizar PIN.' });
    } finally {
      setIsProcessingAccess(false);
    }
  };

  const handleUpdateMasterKey = async (e) => {
    e.preventDefault();
    if (newMasterKeyInput.trim().length < 8) {
      setAccessStatus({ type: 'error', message: 'La Clave Maestra de Seguridad debe tener al menos 8 caracteres.' });
      return;
    }
    setIsProcessingAccess(true);
    setAccessStatus(null);
    try {
      const res = await securityService.adminUpdateMasterRecoveryKey(newMasterKeyInput.trim());
      if (res.success) {
        setAccessStatus({ type: 'success', message: '✅ Clave Maestra de Seguridad actualizada exitosamente en Supabase.' });
        setNewMasterKeyInput('');
      } else {
        setAccessStatus({ type: 'error', message: res.message || 'Error al actualizar Clave Maestra.' });
      }
    } catch {
      setAccessStatus({ type: 'error', message: 'Error de conexión al actualizar Clave Maestra.' });
    } finally {
      setIsProcessingAccess(false);
    }
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

          {/* User Access & PIN Management Section (Admin Only) */}
          {userRole === 'admin' && (
            <div style={{ marginTop: '1.25rem', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <KeyRound size={20} color="#10b981" /> Gestión de Accesos & PINs de Usuarios
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem', margin: 0 }}>
                    Administra y restablece de forma directa los PINs de acceso para Karla y Edson, o actualiza la Clave Maestra de Emergencia.
                  </p>
                </div>
                <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontWeight: '700' }}>
                  Autonomía Zero-Trust
                </span>
              </div>

              {/* Status Alert */}
              {accessStatus && (
                <div style={{
                  background: accessStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: accessStatus.type === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                  color: accessStatus.type === 'success' ? '#6ee7b7' : '#fca5a5',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {accessStatus.type === 'success' ? <Check size={16} /> : <ShieldAlert size={16} />}
                  <span>{accessStatus.message}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* 1. Tarjeta de Karla */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '0.2rem 0.5rem', borderRadius: '9999px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                        OPERADORA
                      </span>
                      <UserCheck size={16} color="#6ee7b7" />
                    </div>
                    <h5 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#f8fafc', margin: '0.2rem 0' }}>
                      Karla
                    </h5>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 0.8rem 0' }}>
                      karla@inovatel.mx (Captura operativa)
                    </p>

                    {/* Botón Reset a Default */}
                    <button
                      type="button"
                      onClick={handleResetKarlaDefault}
                      disabled={isProcessingAccess}
                      style={{
                        width: '100%',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#6ee7b7',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: isProcessingAccess ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <RefreshCw size={14} /> Restablecer a PIN 2020
                    </button>
                  </div>

                  {/* Formulario Asignar PIN Personalizado */}
                  <form onSubmit={handleSaveKarlaCustomPin} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '0.35rem' }}>
                      O asignar nuevo PIN a Karla:
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="text"
                        placeholder="Ej. 1234"
                        value={karlaCustomPin}
                        onChange={(e) => setKarlaCustomPin(e.target.value)}
                        style={{
                          flex: 1,
                          height: '36px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '0 0.6rem',
                          fontSize: '0.85rem'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isProcessingAccess}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '8px',
                          padding: '0 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: isProcessingAccess ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Check size={14} /> Guardar
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. Tarjeta de Edson */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', padding: '0.2rem 0.5rem', borderRadius: '9999px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
                        ADMINISTRADOR
                      </span>
                      <Key size={16} color="#38bdf8" />
                    </div>
                    <h5 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#f8fafc', margin: '0.2rem 0' }}>
                      Edson
                    </h5>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 0.8rem 0' }}>
                      edson@inovatel.mx (Control total del sistema)
                    </p>
                  </div>

                  {/* Formulario Cambiar PIN Edson */}
                  <form onSubmit={handleUpdateEdsonPin} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '0.35rem' }}>
                      Actualizar mi PIN de Administrador:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <input
                        type="password"
                        placeholder="Nuevo PIN (mín. 4 caracteres)"
                        value={edsonNewPin}
                        onChange={(e) => setEdsonNewPin(e.target.value)}
                        style={{
                          height: '36px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '0 0.6rem',
                          fontSize: '0.85rem'
                        }}
                      />
                      <input
                        type="password"
                        placeholder="Confirmar Nuevo PIN"
                        value={edsonConfirmPin}
                        onChange={(e) => setEdsonConfirmPin(e.target.value)}
                        style={{
                          height: '36px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '0 0.6rem',
                          fontSize: '0.85rem'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isProcessingAccess}
                        style={{
                          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '8px',
                          height: '36px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: isProcessingAccess ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Check size={14} /> Actualizar mi PIN
                      </button>
                    </div>
                  </form>
                </div>

                {/* 3. Tarjeta Clave Maestra de Seguridad */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '0.2rem 0.5rem', borderRadius: '9999px', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                        RESCATE DE EMERGENCIA
                      </span>
                      <ShieldCheck size={16} color="#c084fc" />
                    </div>
                    <h5 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#f8fafc', margin: '0.2rem 0' }}>
                      Clave Maestra de Seguridad
                    </h5>
                    <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0 0 0.8rem 0' }}>
                      Frase secreta utilizada para rescatar cualquier PIN en la pantalla de login si se olvida.
                    </p>
                  </div>

                  <form onSubmit={handleUpdateMasterKey} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '0.35rem' }}>
                      Cambiar Clave Maestra (mín. 8 caracteres):
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="password"
                        placeholder="Nueva Clave Maestra..."
                        value={newMasterKeyInput}
                        onChange={(e) => setNewMasterKeyInput(e.target.value)}
                        style={{
                          flex: 1,
                          height: '36px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '0 0.6rem',
                          fontSize: '0.85rem'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isProcessingAccess}
                        style={{
                          background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '8px',
                          padding: '0 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: isProcessingAccess ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Check size={14} /> Guardar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

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
