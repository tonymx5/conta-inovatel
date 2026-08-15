import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit3, CheckCircle, XCircle } from 'lucide-react';
import { storageService } from '../services/storageService';

export default function ClientsModule() {
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rfc: '',
    appliesIsr: true,
    isrRate: 1.25
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => {
    setClients(storageService.getClients());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clientToSave = {
      id: editingId || undefined,
      name: formData.name.toUpperCase().trim(),
      rfc: formData.rfc.toUpperCase().trim(),
      appliesIsr: formData.appliesIsr,
      isrRate: formData.appliesIsr ? (formData.isrRate || 1.25) : 0
    };

    const updated = storageService.saveClient(clientToSave);
    setClients(updated);
    setShowModal(false);
    resetForm();
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setFormData({
      name: c.name,
      rfc: c.rfc,
      appliesIsr: c.appliesIsr,
      isrRate: c.isrRate || 1.25
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente del catálogo?')) {
      const updated = storageService.deleteClient(id);
      setClients(updated);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      rfc: '',
      appliesIsr: true,
      isrRate: 1.25
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.35rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users color="#6366f1" size={26} /> Catálogo de Clientes
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            Dar de alta RFCs de clientes y configurar qué clientes aplican para retención de ISR (1.25% RESICO)
          </p>
        </div>

        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Dar de Alta Cliente
        </button>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Nombre / Razón Social</th>
              <th>RFC</th>
              <th>¿Aplica Retención ISR?</th>
              <th>Tasa ISR por Default</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem' }}>
                  No hay clientes registrados en el catálogo.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: '700', color: '#0f172a' }}>{c.name}</td>
                  <td style={{ fontFamily: 'monospace', color: '#0369a1', fontWeight: '700' }}>{c.rfc}</td>
                  <td>
                    {c.appliesIsr ? (
                      <span className="badge badge-emerald">
                        <CheckCircle size={13} /> SÍ (Se Retiene ISR)
                      </span>
                    ) : (
                      <span className="badge badge-amber">
                        <XCircle size={13} /> NO (No Contabiliza ISR)
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: '700', color: c.appliesIsr ? '#b45309' : '#94a3b8' }}>
                    {c.appliesIsr ? `${c.isrRate || 1.25}%` : 'N/A'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => handleEdit(c)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }} title="Editar">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }} title="Eliminar">
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: '800', color: '#0f172a' }}>
                {editingId ? 'Editar Cliente' : 'Alta de Nuevo Cliente'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nombre o Razón Social:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: JOINT, MAJESTIC, ALCO..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">RFC del Cliente:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: JOI190822ABC"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                    required
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '700', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.appliesIsr}
                      onChange={(e) => setFormData({ ...formData, appliesIsr: e.target.checked })}
                    />
                    ¿Aplica Retención de ISR para este Cliente?
                  </label>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.4rem', fontWeight: '500' }}>
                    Si se marca "NO", las facturas de este cliente no descontarán la retención de ISR en el panel principal.
                  </p>

                  {formData.appliesIsr && (
                    <div className="form-group" style={{ marginTop: '0.8rem' }}>
                      <label className="form-label">Tasa de Retención ISR por Defecto:</label>
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
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
