// LocalStorage & Supabase Dual-Sync Service for Conta Inovatel
import { supabase } from './supabaseClient';
import { formatFolio } from '../utils/folioFormatter';

const STORAGE_KEYS = {
  CLIENTS: 'conta_inovatel_clients',
  INVOICES: 'conta_inovatel_invoices',
  TAX_CONFIG: 'conta_inovatel_tax_config',
  DEDUCTIBLE_EXPENSES: 'conta_inovatel_deductibles',
  ACCOUNT_DEPOSITS: 'conta_inovatel_account_deposits',
  OTHER_INCOME: 'conta_inovatel_other_income',
  CARD_EXPENSES: 'conta_inovatel_card_expenses',
  BANK_ACCOUNTS: 'conta_inovatel_bank_accounts',
  INVESTMENTS: 'conta_inovatel_investments',
  AUDIT_LOGS: 'conta_inovatel_audit_logs',
  SECURITY_INCIDENTS: 'conta_inovatel_security_incidents'
};

const initialClients = [
  { id: 'c1', name: 'JOINT', rfc: 'JOI190822ABC', email: 'contacto@joint.mx', phone: '6641234567', sector: 'Tecnología', notes: 'Retención ISR 1.25% aplicada', appliesIsr: true, isrRate: 1.25 },
  { id: 'c2', name: 'MAJESTIC', rfc: 'MAJ200115DEF', email: 'finanzas@majestic.com', phone: '6642345678', sector: 'Servicios', notes: 'Retención ISR 1.25% aplicada', appliesIsr: true, isrRate: 1.25 },
  { id: 'c3', name: 'GRACIELA', rfc: 'GRA850410GHI', email: 'graciela@empresa.com', phone: '6643456789', sector: 'Consultoría', notes: 'Sin retención', appliesIsr: false, isrRate: 0 },
  { id: 'c4', name: 'ELIZABEHT', rfc: 'ELI911005JKL', email: 'elizabeth@inovatel.mx', phone: '6644567890', sector: 'Salud', notes: 'Sin retención', appliesIsr: false, isrRate: 0 },
  { id: 'c5', name: 'ALCO', rfc: 'ALC180312MNO', email: 'compras@alco.mx', phone: '6645678901', sector: 'Construcción', notes: 'Retención ISR 1.25% aplicada', appliesIsr: true, isrRate: 1.25 },
  { id: 'c6', name: 'ALVARADOS', rfc: 'ALV190930PQR', email: 'ventas@alvarados.com', phone: '6646789012', sector: 'Logística', notes: 'Retención ISR 1.25% aplicada', appliesIsr: true, isrRate: 1.25 },
  { id: 'c7', name: 'EDGAR', rfc: 'EDG920415XYZ', email: 'edgar@gmail.com', phone: '6647890123', sector: 'Comercial', notes: 'Sin retención', appliesIsr: false, isrRate: 0 }
];

const initialInvoices = [
  // Julio 2026 (8 Facturas)
  { id: 'inv1', folio: 'FK-101', clientName: 'JOINT', rfc: 'JOI190822ABC', date: '2026-07-01', subtotal: 7006.41, discount: 0, baseNeta: 7006.41, ivaRate: 8, ivaTotal: 560.52, appliesIsr: true, isrRate: 1.25, isrRetained: 87.52, total: 7479.41, status: 'PAGADA' },
  { id: 'inv2', folio: 'FK-102', clientName: 'MAJESTIC', rfc: 'MAJ200115DEF', date: '2026-07-03', subtotal: 649.87, discount: 0, baseNeta: 649.87, ivaRate: 8, ivaTotal: 52.00, appliesIsr: true, isrRate: 1.25, isrRetained: 8.00, total: 693.87, status: 'PAGADA' },
  { id: 'inv3', folio: 'FK-103', clientName: 'GRACIELA', rfc: 'GRA850410GHI', date: '2026-07-05', subtotal: 780.00, discount: 0, baseNeta: 780.00, ivaRate: 8, ivaTotal: 62.40, appliesIsr: false, isrRate: 0, isrRetained: 0.00, total: 842.40, status: 'PAGADA' },
  { id: 'inv4', folio: 'FK-104', clientName: 'ELIZABEHT', rfc: 'ELI911005JKL', date: '2026-07-07', subtotal: 1235.00, discount: 0, baseNeta: 1235.00, ivaRate: 8, ivaTotal: 98.80, appliesIsr: false, isrRate: 0, isrRetained: 0.00, total: 1333.80, status: 'PAGADA' },
  { id: 'inv5', folio: 'FK-105', clientName: 'ALCO', rfc: 'ALC180312MNO', date: '2026-07-09', subtotal: 1600.00, discount: 0, baseNeta: 1600.00, ivaRate: 8, ivaTotal: 128.00, appliesIsr: true, isrRate: 1.25, isrRetained: 20.00, total: 1708.00, status: 'PAGADA' },
  { id: 'inv6', folio: 'FK-106', clientName: 'ALVARADOS', rfc: 'ALV190930PQR', date: '2026-07-11', subtotal: 4000.00, discount: 0, baseNeta: 4000.00, ivaRate: 8, ivaTotal: 320.00, appliesIsr: true, isrRate: 1.25, isrRetained: 50.00, total: 4270.00, status: 'PAGADA' },
  { id: 'inv7', folio: 'FK-107', clientName: 'EDGAR', rfc: 'EDG920415XYZ', date: '2026-07-15', subtotal: 450.00, discount: 0, baseNeta: 450.00, ivaRate: 8, ivaTotal: 36.00, appliesIsr: false, isrRate: 0, isrRetained: 0.00, total: 486.00, status: 'PAGADA' },
  { id: 'inv8', folio: 'FK-108', clientName: 'ALVARADOS', rfc: 'ALV190930PQR', date: '2026-07-20', subtotal: 4000.00, discount: 0, baseNeta: 4000.00, ivaRate: 8, ivaTotal: 320.00, appliesIsr: true, isrRate: 1.25, isrRetained: 50.00, total: 4270.00, status: 'PAGADA' },

  // Agosto 2026 (2 Facturas)
  { id: 'inv9', folio: 'FK-665', clientName: 'ALVARADOS', rfc: 'ALV190930PQR', date: '2026-08-04', subtotal: 35720.00, discount: 1786.00, baseNeta: 33934.00, ivaRate: 8, ivaTotal: 2714.72, appliesIsr: true, isrRate: 1.25, isrRetained: 424.18, total: 36224.54, status: 'PAGADA' },
  { id: 'inv10', folio: 'FK-659', clientName: 'JOINT', rfc: 'JOI190822ABC', date: '2026-08-10', subtotal: 6909.60, discount: 0, baseNeta: 6909.60, ivaRate: 8, ivaTotal: 553.10, appliesIsr: true, isrRate: 1.25, isrRetained: 86.37, total: 7376.33, status: 'PAGADA' }
];

const initialDeductibles = [
  { id: 'd1', providerName: 'Office Depot', rfc: 'ODE930805B27', invoiceNo: 'PDF-9921', date: '2026-07-04', subtotal: 1250.00, discount: 0, ivaTotal: 200.00, total: 1450.00, category: 'Papelería / Oficina' },
  { id: 'd2', providerName: 'Telmex', rfc: 'EME8903099C7', invoiceNo: 'PDF-8812', date: '2026-07-12', subtotal: 860.00, discount: 0, ivaTotal: 137.60, total: 997.60, category: 'Telecomunicaciones' },
  { id: 'd3', providerName: 'SYSCOM (Computación y Telecomunicaciones)', rfc: 'STE940428KBA', invoiceNo: 'FA26/1441633', date: '2026-08-15', subtotal: 20326.80, discount: 0, ivaTotal: 3252.29, total: 23579.09, category: 'Equipos & Telecomunicaciones' }
];

const initialAccountDeposits = [
  { id: 'dep1', concept: 'Transferencia Cobro Factura FK-101 (JOINT)', amount: 7479.41, date: '2026-07-02', bankName: 'Santander', reference: 'SPEI-88192', appliesEquipmentExpense: false, equipmentExpense: 0, equipmentProvider: '', realUtility: 7479.41 },
  { id: 'dep2', concept: 'Transferencia Cobro Factura FK-106 (ALVARADOS)', amount: 4270.00, date: '2026-07-12', bankName: 'Santander', reference: 'SPEI-44910', appliesEquipmentExpense: false, equipmentExpense: 0, equipmentProvider: '', realUtility: 4270.00 },
  { id: 'dep3', concept: 'Transferencia Cobro Factura FK-665 (ALVARADOS)', amount: 36224.54, date: '2026-08-05', bankName: 'Santander', reference: 'SPEI-99201', appliesEquipmentExpense: true, equipmentExpense: 21952.94, equipmentProvider: 'SYSCOM (Equipos)', realUtility: 14271.60 },
  { id: 'dep4', concept: 'deposito a cuenta (alvarado)', amount: 32180.05, date: '2026-08-04', bankName: 'NU', reference: 'SPEI-88347', appliesEquipmentExpense: false, equipmentExpense: 0, equipmentProvider: '', realUtility: 32180.05 }
];

const initialBankAccounts = [
  { id: 'b1', bankName: 'Santander', type: 'Débito', accountNumber: '**** 8819', balance: 0 },
  { id: 'b2', bankName: 'NU', type: 'Crédito', accountNumber: '**** 4420', balance: 0 },
  { id: 'b3', bankName: 'Banregio', type: 'Débito', accountNumber: '**** 1190', balance: 0 },
  { id: 'b4', bankName: 'Stori', type: 'Crédito', accountNumber: '**** 9931', balance: 0 }
];

function getStorageItem(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Storage Read Error:', e);
    return defaultValue;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage Write Error:', e);
  }
}

function notifyDataSynced() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('conta_data_synced'));
  }
}

export const storageService = {
  // Sync on startup from Supabase
  syncFromSupabase: async () => {
    try {
      const [invRes, cliRes, dedRes, depRes, taxRes] = await Promise.all([
        supabase.from('invoices').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('deductibles').select('*'),
        supabase.from('account_deposits').select('*'),
        supabase.from('tax_config').select('*').limit(1).single()
      ]);

      if (invRes.data && invRes.data.length > 0) {
        const localInvoices = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices);
        const localMap = new Map(localInvoices.map(i => [i.id, i]));

        const mappedInvoices = invRes.data.map(i => {
          const local = localMap.get(i.id);
          return {
            id: i.id,
            folio: formatFolio(i.folio || local?.folio),
            clientName: i.client_name || i.clientName || local?.clientName || '',
            rfc: i.rfc || local?.rfc || '',
            date: i.date || local?.date || '',
            isMixedTax: i.is_mixed_tax !== undefined && i.is_mixed_tax !== null ? !!i.is_mixed_tax : (local?.isMixedTax || false),
            subtotal: parseFloat(i.subtotal) || 0,
            discount: parseFloat(i.discount) || 0,
            subtotal8: parseFloat(i.subtotal8) || 0,
            subtotal16: parseFloat(i.subtotal16) || 0,
            ivaRate: parseFloat(i.iva_rate) || 8,
            ivaTotal: parseFloat(i.iva_total) || 0,
            appliesIsr: i.applies_isr !== undefined && i.applies_isr !== null ? !!i.applies_isr : (local?.appliesIsr !== undefined ? !!local.appliesIsr : true),
            isrRate: i.isr_rate !== undefined && i.isr_rate !== null ? (parseFloat(i.isr_rate) || 1.25) : (local?.isrRate || 1.25),
            isrRetained: parseFloat(i.isr_retained) || 0,
            baseNeta: parseFloat(i.base_neta) || 0,
            total: parseFloat(i.total) || 0,
            status: i.status || 'PAGADA'
          };
        });
        setStorageItem(STORAGE_KEYS.INVOICES, mappedInvoices);
      }

      if (cliRes.data && cliRes.data.length > 0) {
        const localClients = getStorageItem(STORAGE_KEYS.CLIENTS, initialClients);
        const localMap = new Map(localClients.map(c => [c.id, c]));

        const mappedClients = cliRes.data.map(c => {
          const local = localMap.get(c.id);
          
          let appliesIsr = true;
          if (c.applies_isr !== undefined && c.applies_isr !== null) {
            appliesIsr = !!c.applies_isr;
          } else if (c.appliesIsr !== undefined && c.appliesIsr !== null) {
            appliesIsr = !!c.appliesIsr;
          } else if (local && local.appliesIsr !== undefined) {
            appliesIsr = !!local.appliesIsr;
          }

          let isrRate = 1.25;
          if (c.isr_rate !== undefined && c.isr_rate !== null) {
            isrRate = parseFloat(c.isr_rate);
          } else if (c.isrRate !== undefined && c.isrRate !== null) {
            isrRate = parseFloat(c.isrRate);
          } else if (local && local.isrRate !== undefined) {
            isrRate = parseFloat(local.isrRate);
          }

          return {
            id: c.id,
            name: c.name,
            rfc: c.rfc,
            email: c.email || (local?.email || ''),
            phone: c.phone || (local?.phone || ''),
            sector: c.sector || (local?.sector || ''),
            notes: c.notes || (local?.notes || ''),
            appliesIsr,
            isrRate
          };
        });
        setStorageItem(STORAGE_KEYS.CLIENTS, mappedClients);
      }

      if (dedRes.data && dedRes.data.length > 0) {
        const mappedDeds = dedRes.data.map(d => ({
          id: d.id,
          providerName: d.provider_name || d.providerName,
          rfc: d.rfc,
          invoiceNo: d.invoice_no || d.invoiceNo,
          date: d.date,
          subtotal: parseFloat(d.subtotal) || 0,
          discount: parseFloat(d.discount) || 0,
          ivaTotal: parseFloat(d.iva_total) || 0,
          total: parseFloat(d.total) || 0,
          category: d.category,
          fileName: d.file_name || d.fileName,
          fileUrl: d.file_url || d.fileUrl
        }));
        setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, mappedDeds);
      }

      if (depRes.data && depRes.data.length > 0) {
        const localDeps = getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, initialAccountDeposits);
        const localMap = new Map(localDeps.map(d => [d.id, d]));

        depRes.data.forEach(dp => {
          const amount = parseFloat(dp.amount) || 0;
          const appliesEquipmentExpense = dp.applies_equipment_expense !== undefined && dp.applies_equipment_expense !== null 
            ? !!dp.applies_equipment_expense 
            : ((parseFloat(dp.equipment_expense) || 0) > 0);
          const equipmentExpense = appliesEquipmentExpense ? (parseFloat(dp.equipment_expense) || 0) : 0;
          const realUtility = dp.real_utility !== undefined && dp.real_utility !== null
            ? parseFloat(dp.real_utility)
            : (amount - equipmentExpense);

          const remoteDep = {
            id: dp.id,
            concept: dp.concept,
            amount,
            date: dp.date,
            bankName: dp.bank_name || dp.bankName || 'Santander',
            reference: dp.reference || '',
            appliesEquipmentExpense,
            equipmentExpense,
            equipmentProvider: dp.equipment_provider || dp.equipmentProvider || '',
            realUtility: parseFloat(realUtility.toFixed(2))
          };

          const existingLocal = localMap.get(dp.id);
          if (existingLocal) {
            localMap.set(dp.id, {
              ...remoteDep,
              ...existingLocal,
              appliesEquipmentExpense: existingLocal.appliesEquipmentExpense !== undefined ? existingLocal.appliesEquipmentExpense : remoteDep.appliesEquipmentExpense,
              equipmentExpense: existingLocal.equipmentExpense !== undefined ? existingLocal.equipmentExpense : remoteDep.equipmentExpense,
              equipmentProvider: existingLocal.equipmentProvider !== undefined ? existingLocal.equipmentProvider : remoteDep.equipmentProvider,
              realUtility: existingLocal.realUtility !== undefined ? existingLocal.realUtility : remoteDep.realUtility
            });
          } else {
            localMap.set(dp.id, remoteDep);
          }
        });

        const mergedDeps = Array.from(localMap.values());
        setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, mergedDeps);
      }

      if (taxRes.data) {
        setStorageItem(STORAGE_KEYS.TAX_CONFIG, { isrEstimatedRate: parseFloat(taxRes.data.isr_estimated_rate) || 1.25 });
      }

      // Notify UI components that cloud data has been synchronized
      notifyDataSynced();
    } catch (err) {
      console.warn('Supabase sync warning (running offline / local cache):', err);
    }
  },

  // Config
  getTaxConfig: () => getStorageItem(STORAGE_KEYS.TAX_CONFIG, { isrEstimatedRate: 1.25 }),
  saveTaxConfig: (config) => {
    setStorageItem(STORAGE_KEYS.TAX_CONFIG, config);
    Promise.resolve(supabase.from('tax_config').upsert({
      id: 'default',
      isr_estimated_rate: config.isrEstimatedRate,
      last_updated: new Date().toISOString()
    })).catch(err => console.error('Supabase TaxConfig error:', err));
    notifyDataSynced();
  },

  // Clients
  getClients: () => getStorageItem(STORAGE_KEYS.CLIENTS, initialClients),
  saveClient: (client, user = 'admin') => {
    const clients = getStorageItem(STORAGE_KEYS.CLIENTS, initialClients);
    const existingIndex = clients.findIndex(c => c.id === client.id);
    const existing = existingIndex >= 0 ? clients[existingIndex] : {};

    const clientToSave = {
      ...existing,
      ...client,
      id: client.id || 'cli-' + Date.now(),
      name: (client.name || existing.name || '').toUpperCase().trim(),
      rfc: (client.rfc || existing.rfc || '').toUpperCase().trim(),
      appliesIsr: client.appliesIsr !== undefined ? !!client.appliesIsr : (existing.appliesIsr !== undefined ? !!existing.appliesIsr : true),
      isrRate: client.appliesIsr ? (client.isrRate !== undefined ? parseFloat(client.isrRate) : (existing.isrRate || 1.25)) : 0
    };

    if (existingIndex >= 0) {
      clients[existingIndex] = clientToSave;
    } else {
      clients.push(clientToSave);
    }
    setStorageItem(STORAGE_KEYS.CLIENTS, clients);

    // Sync to Supabase
    Promise.resolve(supabase.from('clients').upsert({
      id: clientToSave.id,
      name: clientToSave.name,
      rfc: clientToSave.rfc,
      email: clientToSave.email || null,
      phone: clientToSave.phone || null,
      sector: clientToSave.sector || null,
      notes: clientToSave.notes || null,
      applies_isr: clientToSave.appliesIsr,
      isr_rate: clientToSave.isrRate
    })).catch(err => {
      // Graceful fallback if table column is still propagating
      if (err?.message?.includes('column') || err?.code === 'PGRST204') {
        supabase.from('clients').upsert({
          id: clientToSave.id,
          name: clientToSave.name,
          rfc: clientToSave.rfc,
          email: clientToSave.email || null,
          phone: clientToSave.phone || null,
          sector: clientToSave.sector || null,
          notes: clientToSave.notes || null
        }).catch(e => console.error('Supabase Client fallback save error:', e));
      } else {
        console.error('Supabase Client save error:', err);
      }
    });

    storageService.logAudit(user, existingIndex >= 0 ? 'EDITAR_CLIENTE' : 'CREAR_CLIENTE', `${clientToSave.name} (${clientToSave.rfc}) - ISR: ${clientToSave.appliesIsr ? `${clientToSave.isrRate}%` : 'NO'}`);
    notifyDataSynced();
    return clients;
  },
  deleteClient: (id, user = 'admin') => {
    const clients = getStorageItem(STORAGE_KEYS.CLIENTS, initialClients).filter(c => c.id !== id);
    setStorageItem(STORAGE_KEYS.CLIENTS, clients);
    Promise.resolve(supabase.from('clients').delete().eq('id', id)).catch(err => console.error('Supabase Client delete error:', err));
    storageService.logAudit(user, 'ELIMINAR_CLIENTE', `ID ${id}`);
    notifyDataSynced();
    return clients;
  },

  // Invoices
  getInvoices: () => {
    const list = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices);
    return list.map(inv => ({ ...inv, folio: formatFolio(inv.folio) }));
  },
  saveInvoice: (invoice, user = 'admin') => {
    const invoices = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices);
    const existingIndex = invoices.findIndex(i => i.id === invoice.id);
    const updatedInvoice = { 
      ...invoice, 
      id: invoice.id || 'inv-' + Date.now(),
      folio: formatFolio(invoice.folio)
    };

    if (existingIndex >= 0) {
      invoices[existingIndex] = updatedInvoice;
    } else {
      invoices.push(updatedInvoice);
    }
    setStorageItem(STORAGE_KEYS.INVOICES, invoices);

    // Sync to Supabase
    Promise.resolve(supabase.from('invoices').upsert({
      id: updatedInvoice.id,
      folio: updatedInvoice.folio,
      client_name: updatedInvoice.clientName,
      rfc: updatedInvoice.rfc,
      date: updatedInvoice.date,
      is_mixed_tax: !!updatedInvoice.isMixedTax,
      subtotal: updatedInvoice.subtotal || 0,
      discount: updatedInvoice.discount || 0,
      subtotal8: updatedInvoice.subtotal8 || 0,
      subtotal16: updatedInvoice.subtotal16 || 0,
      iva_rate: updatedInvoice.ivaRate || 8,
      iva_total: updatedInvoice.ivaTotal || 0,
      applies_isr: !!updatedInvoice.appliesIsr,
      isr_rate: updatedInvoice.isrRate || 1.25,
      isr_retained: updatedInvoice.isrRetained || 0,
      base_neta: updatedInvoice.baseNeta || 0,
      total: updatedInvoice.total || 0,
      status: updatedInvoice.status || 'PAGADA'
    })).catch(err => console.error('Supabase Invoice save error:', err));

    storageService.logAudit(user, existingIndex >= 0 ? 'EDITAR_FACTURA' : 'CREAR_FACTURA', `Factura ${updatedInvoice.folio} (${updatedInvoice.clientName})`);
    notifyDataSynced();
    return invoices;
  },
  deleteInvoice: (id, user = 'admin') => {
    const invoices = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices).filter(i => i.id !== id);
    setStorageItem(STORAGE_KEYS.INVOICES, invoices);
    Promise.resolve(supabase.from('invoices').delete().eq('id', id)).catch(err => console.error('Supabase Invoice delete error:', err));
    storageService.logAudit(user, 'ELIMINAR_FACTURA', `ID ${id}`);
    notifyDataSynced();
    return invoices;
  },

  // Deductibles (Fact Prov)
  getDeductibles: () => getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, initialDeductibles),
  saveDeductible: (item, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, initialDeductibles);
    const itemToSave = { ...item, id: item.id || 'ded-' + Date.now() };
    const idx = list.findIndex(d => d.id === itemToSave.id);

    if (idx >= 0) list[idx] = itemToSave; else list.push(itemToSave);
    setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, list);

    // Sync to Supabase
    Promise.resolve(supabase.from('deductibles').upsert({
      id: itemToSave.id,
      provider_name: itemToSave.providerName,
      rfc: itemToSave.rfc,
      invoice_no: itemToSave.invoiceNo,
      date: itemToSave.date,
      subtotal: itemToSave.subtotal || 0,
      discount: itemToSave.discount || 0,
      iva_total: itemToSave.ivaTotal || 0,
      total: itemToSave.total || 0,
      category: itemToSave.category || 'Telecomunicaciones',
      file_name: itemToSave.fileName,
      file_url: itemToSave.fileUrl
    })).catch(err => console.error('Supabase Deductible save error:', err));

    storageService.logAudit(user, 'GUARDAR_DEDUCCION_PROVEEDOR', `${itemToSave.providerName} - IVA $${itemToSave.ivaTotal}`);
    notifyDataSynced();
    return list;
  },
  deleteDeductible: (id, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, initialDeductibles).filter(d => d.id !== id);
    setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, list);
    Promise.resolve(supabase.from('deductibles').delete().eq('id', id)).catch(err => console.error('Supabase Deductible delete error:', err));
    storageService.logAudit(user, 'ELIMINAR_DEDUCCION', `ID ${id}`);
    notifyDataSynced();
    return list;
  },

  // Account Deposits (Depósitos a Cuenta / Transferencias)
  getAccountDeposits: () => getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, initialAccountDeposits),
  saveAccountDeposit: (deposit, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, initialAccountDeposits);
    const amount = parseFloat(deposit.amount) || 0;
    const appliesEquipmentExpense = !!deposit.appliesEquipmentExpense;
    const equipmentExpense = appliesEquipmentExpense ? (parseFloat(deposit.equipmentExpense) || 0) : 0;
    const realUtility = parseFloat((amount - equipmentExpense).toFixed(2));

    const depToSave = {
      ...deposit,
      id: deposit.id || 'dep-' + Date.now(),
      amount,
      appliesEquipmentExpense,
      equipmentExpense,
      equipmentProvider: (deposit.equipmentProvider || '').trim(),
      realUtility
    };

    const idx = list.findIndex(d => d.id === depToSave.id);
    if (idx >= 0) list[idx] = depToSave; else list.push(depToSave);
    setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, list);

    // Sync to Supabase
    Promise.resolve(supabase.from('account_deposits').upsert({
      id: depToSave.id,
      concept: depToSave.concept,
      amount: depToSave.amount,
      date: depToSave.date,
      bank_name: depToSave.bankName || 'Santander',
      reference: depToSave.reference,
      applies_equipment_expense: depToSave.appliesEquipmentExpense,
      equipment_expense: depToSave.equipmentExpense,
      equipment_provider: depToSave.equipmentProvider,
      real_utility: depToSave.realUtility
    })).catch(err => console.error('Supabase Deposit save error:', err));

    storageService.logAudit(user, 'REGISTRAR_DEPOSITO_CUENTA', `${depToSave.concept} ($${depToSave.amount}) | Utilidad Real: $${depToSave.realUtility}`);
    notifyDataSynced();
    return list;
  },
  deleteAccountDeposit: (id, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, initialAccountDeposits).filter(d => d.id !== id);
    setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, list);
    Promise.resolve(supabase.from('account_deposits').delete().eq('id', id)).catch(err => console.error('Supabase Deposit delete error:', err));
    storageService.logAudit(user, 'ELIMINAR_DEPOSITO_CUENTA', `ID ${id}`);
    notifyDataSynced();
    return list;
  },

  // Other Income
  getOtherIncome: () => getStorageItem(STORAGE_KEYS.OTHER_INCOME, []),
  saveOtherIncome: (item, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.OTHER_INCOME, []);
    const itemToSave = { ...item, id: item.id || 'oth_' + Date.now() };
    const idx = list.findIndex(o => o.id === itemToSave.id);
    if (idx >= 0) list[idx] = itemToSave; else list.push(itemToSave);
    setStorageItem(STORAGE_KEYS.OTHER_INCOME, list);
    storageService.logAudit(user, 'GUARDAR_OTRO_INGRESO', `${itemToSave.concept} ($${itemToSave.amount})`);
    notifyDataSynced();
    return list;
  },
  deleteOtherIncome: (id, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.OTHER_INCOME, []).filter(o => o.id !== id);
    setStorageItem(STORAGE_KEYS.OTHER_INCOME, list);
    storageService.logAudit(user, 'ELIMINAR_OTRO_INGRESO', `ID ${id}`);
    notifyDataSynced();
    return list;
  },

  // Bank Accounts & Card Expenses
  getBankAccounts: () => getStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, initialBankAccounts),
  saveBankAccount: (account) => {
    const list = getStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, initialBankAccounts);
    const bankToSave = { ...account, id: account.id || 'b_' + Date.now() };
    const idx = list.findIndex(b => b.id === bankToSave.id);
    if (idx >= 0) list[idx] = bankToSave; else list.push(bankToSave);
    setStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, list);
    notifyDataSynced();
    return list;
  },
  deleteBankAccount: (id) => {
    const list = getStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, initialBankAccounts).filter(b => b.id !== id);
    setStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, list);
    notifyDataSynced();
    return list;
  },
  getCardExpenses: () => getStorageItem(STORAGE_KEYS.CARD_EXPENSES, []),
  saveCardExpense: (expense, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.CARD_EXPENSES, []);
    const expToSave = { ...expense, id: expense.id || 'exp_' + Date.now() };
    const idx = list.findIndex(e => e.id === expToSave.id);
    if (idx >= 0) list[idx] = expToSave; else list.push(expToSave);
    setStorageItem(STORAGE_KEYS.CARD_EXPENSES, list);
    storageService.logAudit(user, 'REGISTRAR_GASTO_TARJETA', `$${expToSave.amount} - ${expToSave.bankName}`);
    notifyDataSynced();
    return list;
  },
  deleteCardExpense: (id, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.CARD_EXPENSES, []).filter(e => e.id !== id);
    setStorageItem(STORAGE_KEYS.CARD_EXPENSES, list);
    storageService.logAudit(user, 'ELIMINAR_GASTO_TARJETA', `ID ${id}`);
    notifyDataSynced();
    return list;
  },

  // Investments
  getInvestments: () => getStorageItem(STORAGE_KEYS.INVESTMENTS, []),
  saveInvestment: (inv, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.INVESTMENTS, []);
    const invToSave = { ...inv, id: inv.id || 'inv_ast_' + Date.now() };
    const idx = list.findIndex(i => i.id === invToSave.id);
    if (idx >= 0) list[idx] = invToSave; else list.push(invToSave);
    setStorageItem(STORAGE_KEYS.INVESTMENTS, list);
    storageService.logAudit(user, 'REGISTRAR_INVERSION', `${invToSave.assetName} ($${invToSave.amountInvested})`);
    notifyDataSynced();
    return list;
  },
  deleteInvestment: (id, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.INVESTMENTS, []).filter(i => i.id !== id);
    setStorageItem(STORAGE_KEYS.INVESTMENTS, list);
    storageService.logAudit(user, 'ELIMINAR_INVERSION', `ID ${id}`);
    notifyDataSynced();
    return list;
  },

  // Audit Logs
  getAuditLogs: () => getStorageItem(STORAGE_KEYS.AUDIT_LOGS, []),
  logAudit: (username, action, details) => {
    const logs = getStorageItem(STORAGE_KEYS.AUDIT_LOGS, []);
    const logItem = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      username,
      action,
      details
    };
    logs.unshift(logItem);
    setStorageItem(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 200));

    Promise.resolve(supabase.from('audit_logs').insert({
      id: logItem.id,
      timestamp: logItem.timestamp,
      action: logItem.action,
      details: logItem.details,
      user_role: username
    })).catch(err => console.error('Supabase Log save error:', err));
  },

  // Security Incidents
  getSecurityIncidents: () => getStorageItem(STORAGE_KEYS.SECURITY_INCIDENTS, []),
  logSecurityIncident: (incidentData) => {
    const incidents = getStorageItem(STORAGE_KEYS.SECURITY_INCIDENTS, []);
    incidents.unshift({
      id: 'inc_' + Date.now(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      failedAttempts: incidentData.attempts,
      triedPasswords: incidentData.triedPasswords || [],
      clientIp: incidentData.ip || '192.168.1.104 (Local LAN)',
      hostname: incidentData.hostname || 'DESKTOP-INOVATEL',
      approxLocation: incidentData.location || 'México (Detectado por Proxy)'
    });
    setStorageItem(STORAGE_KEYS.SECURITY_INCIDENTS, incidents);
  }
};
