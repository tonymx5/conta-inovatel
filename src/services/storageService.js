// LocalStorage & Supabase Dual-Sync Service for Conta Inovatel
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  CLIENTS: 'conta_inovatel_clients',
  INVOICES: 'conta_inovatel_invoices',
  OTHER_INCOME: 'conta_inovatel_other_income',
  DEDUCTIBLE_EXPENSES: 'conta_inovatel_deductibles',
  ACCOUNT_DEPOSITS: 'conta_inovatel_account_deposits',
  BANK_ACCOUNTS: 'conta_inovatel_bank_accounts',
  CARD_EXPENSES: 'conta_inovatel_card_expenses',
  INVESTMENTS: 'conta_inovatel_investments',
  AUDIT_LOGS: 'conta_inovatel_audit_logs',
  SECURITY_INCIDENTS: 'conta_inovatel_security_incidents',
  TAX_CONFIG: 'conta_inovatel_tax_config'
};

// Initial Seed Data with 1.25% RESICO ISR default
const initialClients = [
  { id: 'c1', name: 'JOINT', rfc: 'JOI190822ABC', email: 'contacto@joint.mx', phone: '6641234567', sector: 'Inmobiliario', notes: 'Cliente recurrente' },
  { id: 'c2', name: 'MAJESTIC', rfc: 'MAJ200115DEF', email: 'admin@majestic.com', phone: '6642345678', sector: 'Industrial', notes: 'Pagos vía SPEI' },
  { id: 'c3', name: 'GRACIELA', rfc: 'GRA850410GHI', email: 'graciela@gmail.com', phone: '6643456789', sector: 'Comercial', notes: 'Facturación mensual' },
  { id: 'c4', name: 'ELIZABEHT', rfc: 'ELI911005JKL', email: 'elizabeth@inovatel.mx', phone: '6644567890', sector: 'Servicios', notes: 'Cliente preferencial' },
  { id: 'c5', name: 'ALCO', rfc: 'ALC180312MNO', email: 'finanzas@alco.mx', phone: '6645678901', sector: 'Manufactura', notes: 'Retención ISR 1.25%' },
  { id: 'c6', name: 'ALVARADOS', rfc: 'ALV190930PQR', email: 'ventas@alvarados.com', phone: '6646789012', sector: 'Logística', notes: 'Retención ISR 1.25% aplicada' },
  { id: 'c7', name: 'EDGAR', rfc: 'EDG920415XYZ', email: 'edgar@gmail.com', phone: '6647890123', sector: 'Comercial', notes: 'Sin retención' }
];

const initialInvoices = [
  // Julio 2026 (8 Facturas)
  { id: 'inv1', folio: 'F-101', clientName: 'JOINT', rfc: 'JOI190822ABC', date: '2026-07-01', subtotal: 7006.41, discount: 0, baseNeta: 7006.41, ivaRate: 8, ivaTotal: 560.52, appliesIsr: true, isrRate: 1.25, isrRetained: 87.52, total: 7479.41, status: 'PAGADA' },
  { id: 'inv2', folio: 'F-102', clientName: 'MAJESTIC', rfc: 'MAJ200115DEF', date: '2026-07-03', subtotal: 649.87, discount: 0, baseNeta: 649.87, ivaRate: 8, ivaTotal: 52.00, appliesIsr: true, isrRate: 1.25, isrRetained: 8.00, total: 693.87, status: 'PAGADA' },
  { id: 'inv3', folio: 'F-103', clientName: 'GRACIELA', rfc: 'GRA850410GHI', date: '2026-07-05', subtotal: 780.00, discount: 0, baseNeta: 780.00, ivaRate: 8, ivaTotal: 62.40, appliesIsr: false, isrRate: 0, isrRetained: 0.00, total: 842.40, status: 'PAGADA' },
  { id: 'inv4', folio: 'F-104', clientName: 'ELIZABEHT', rfc: 'ELI911005JKL', date: '2026-07-07', subtotal: 1235.00, discount: 0, baseNeta: 1235.00, ivaRate: 8, ivaTotal: 98.80, appliesIsr: false, isrRate: 0, isrRetained: 0.00, total: 1333.80, status: 'PAGADA' },
  { id: 'inv5', folio: 'F-105', clientName: 'ALCO', rfc: 'ALC180312MNO', date: '2026-07-09', subtotal: 1600.00, discount: 0, baseNeta: 1600.00, ivaRate: 8, ivaTotal: 128.00, appliesIsr: true, isrRate: 1.25, isrRetained: 20.00, total: 1708.00, status: 'PAGADA' },
  { id: 'inv6', folio: 'F-106', clientName: 'ALVARADOS', rfc: 'ALV190930PQR', date: '2026-07-11', subtotal: 4000.00, discount: 0, baseNeta: 4000.00, ivaRate: 8, ivaTotal: 320.00, appliesIsr: true, isrRate: 1.25, isrRetained: 50.00, total: 4270.00, status: 'PAGADA' },
  { id: 'inv7', folio: 'F-107', clientName: 'EDGAR', rfc: 'EDG920415XYZ', date: '2026-07-15', subtotal: 450.00, discount: 0, baseNeta: 450.00, ivaRate: 8, ivaTotal: 36.00, appliesIsr: false, isrRate: 0, isrRetained: 0.00, total: 486.00, status: 'PAGADA' },
  { id: 'inv8', folio: 'F-108', clientName: 'ALVARADOS', rfc: 'ALV190930PQR', date: '2026-07-20', subtotal: 4000.00, discount: 0, baseNeta: 4000.00, ivaRate: 8, ivaTotal: 320.00, appliesIsr: true, isrRate: 1.25, isrRetained: 50.00, total: 4270.00, status: 'PAGADA' },

  // Agosto 2026 (2 Facturas)
  { id: 'inv9', folio: 'fk665', clientName: 'ALVARADOS', rfc: 'ALV190930PQR', date: '2026-08-04', subtotal: 35720.00, discount: 1786.00, baseNeta: 33934.00, ivaRate: 8, ivaTotal: 2714.72, appliesIsr: true, isrRate: 1.25, isrRetained: 424.18, total: 36224.54, status: 'PAGADA' },
  { id: 'inv10', folio: 'F-110', clientName: 'JOINT', rfc: 'JOI190822ABC', date: '2026-08-10', subtotal: 7376.33, discount: 0, baseNeta: 6909.60, ivaRate: 8, ivaTotal: 553.10, appliesIsr: true, isrRate: 1.25, isrRetained: 86.37, total: 7376.33, status: 'PAGADA' }
];

const initialDeductibles = [
  { id: 'd1', providerName: 'Office Depot', rfc: 'ODE930805B27', invoiceNo: 'PDF-9921', date: '2026-07-04', subtotal: 1250.00, discount: 0, ivaTotal: 200.00, total: 1450.00, category: 'Papelería / Oficina' },
  { id: 'd2', providerName: 'Telmex', rfc: 'EME8903099C7', invoiceNo: 'PDF-8812', date: '2026-07-12', subtotal: 860.00, discount: 0, ivaTotal: 137.60, total: 997.60, category: 'Telecomunicaciones' },
  { id: 'd3', providerName: 'SYSCOM (Computación y Telecomunicaciones)', rfc: 'STE940428KBA', invoiceNo: 'FA26/1441633', date: '2026-08-15', subtotal: 20326.80, discount: 0, ivaTotal: 3252.29, total: 23579.09, category: 'Equipos & Telecomunicaciones' }
];

const initialAccountDeposits = [
  { id: 'dep1', concept: 'Transferencia Cobro Factura F-101 (JOINT)', amount: 7479.41, date: '2026-07-02', bankName: 'Santander', reference: 'SPEI-88192' },
  { id: 'dep2', concept: 'Transferencia Cobro Factura F-106 (ALVARADOS)', amount: 4270.00, date: '2026-07-12', bankName: 'Santander', reference: 'SPEI-44910' },
  { id: 'dep3', concept: 'Transferencia Cobro Factura fk665 (ALVARADOS)', amount: 36224.54, date: '2026-08-05', bankName: 'Santander', reference: 'SPEI-99201' }
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
        const mappedInvoices = invRes.data.map(i => ({
          id: i.id,
          folio: i.folio,
          clientName: i.client_name,
          rfc: i.rfc,
          date: i.date,
          isMixedTax: i.is_mixed_tax,
          subtotal: parseFloat(i.subtotal) || 0,
          discount: parseFloat(i.discount) || 0,
          subtotal8: parseFloat(i.subtotal8) || 0,
          subtotal16: parseFloat(i.subtotal16) || 0,
          ivaRate: parseFloat(i.iva_rate) || 8,
          ivaTotal: parseFloat(i.iva_total) || 0,
          appliesIsr: i.applies_isr,
          isrRate: parseFloat(i.isr_rate) || 1.25,
          isrRetained: parseFloat(i.isr_retained) || 0,
          baseNeta: parseFloat(i.base_neta) || 0,
          total: parseFloat(i.total) || 0,
          status: i.status || 'PAGADA'
        }));
        setStorageItem(STORAGE_KEYS.INVOICES, mappedInvoices);
      }

      if (cliRes.data && cliRes.data.length > 0) {
        setStorageItem(STORAGE_KEYS.CLIENTS, cliRes.data);
      }

      if (dedRes.data && dedRes.data.length > 0) {
        const mappedDeds = dedRes.data.map(d => ({
          id: d.id,
          providerName: d.provider_name,
          rfc: d.rfc,
          invoiceNo: d.invoice_no,
          date: d.date,
          subtotal: parseFloat(d.subtotal) || 0,
          discount: parseFloat(d.discount) || 0,
          ivaTotal: parseFloat(d.iva_total) || 0,
          total: parseFloat(d.total) || 0,
          category: d.category,
          fileName: d.file_name,
          fileUrl: d.file_url
        }));
        setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, mappedDeds);
      }

      if (depRes.data && depRes.data.length > 0) {
        const mappedDeps = depRes.data.map(dp => ({
          id: dp.id,
          concept: dp.concept,
          amount: parseFloat(dp.amount) || 0,
          date: dp.date,
          bankName: dp.bank_name,
          reference: dp.reference
        }));
        setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, mappedDeps);
      }

      if (taxRes.data) {
        setStorageItem(STORAGE_KEYS.TAX_CONFIG, { isrEstimatedRate: parseFloat(taxRes.data.isr_estimated_rate) || 1.25 });
      }

      // Notify UI components that cloud data has been synchronized
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('conta_data_synced'));
      }
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
  },

  // Clients
  getClients: () => getStorageItem(STORAGE_KEYS.CLIENTS, initialClients),
  saveClient: (client) => {
    const clients = getStorageItem(STORAGE_KEYS.CLIENTS, initialClients);
    const existingIndex = clients.findIndex(c => c.id === client.id);
    const clientToSave = { ...client, id: client.id || 'cli-' + Date.now() };

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
      email: clientToSave.email,
      phone: clientToSave.phone,
      sector: clientToSave.sector,
      notes: clientToSave.notes
    })).catch(err => console.error('Supabase Client save error:', err));

    return clients;
  },
  deleteClient: (id) => {
    const clients = getStorageItem(STORAGE_KEYS.CLIENTS, initialClients).filter(c => c.id !== id);
    setStorageItem(STORAGE_KEYS.CLIENTS, clients);
    Promise.resolve(supabase.from('clients').delete().eq('id', id)).catch(err => console.error('Supabase Client delete error:', err));
    return clients;
  },

  // Invoices
  getInvoices: () => getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices),
  saveInvoice: (invoice, user = 'admin') => {
    const invoices = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices);
    const existingIndex = invoices.findIndex(i => i.id === invoice.id);
    const updatedInvoice = { ...invoice, id: invoice.id || 'inv-' + Date.now() };

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
    return invoices;
  },
  deleteInvoice: (id, user = 'admin') => {
    const invoices = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices).filter(i => i.id !== id);
    setStorageItem(STORAGE_KEYS.INVOICES, invoices);
    Promise.resolve(supabase.from('invoices').delete().eq('id', id)).catch(err => console.error('Supabase Invoice delete error:', err));
    storageService.logAudit(user, 'ELIMINAR_FACTURA', `ID ${id}`);
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
    return list;
  },
  deleteDeductible: (id, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, initialDeductibles).filter(d => d.id !== id);
    setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, list);
    Promise.resolve(supabase.from('deductibles').delete().eq('id', id)).catch(err => console.error('Supabase Deductible delete error:', err));
    storageService.logAudit(user, 'ELIMINAR_DEDUCCION', `ID ${id}`);
    return list;
  },

  // Account Deposits (Depósitos a Cuenta / Transferencias)
  getAccountDeposits: () => getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, initialAccountDeposits),
  saveAccountDeposit: (deposit, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, initialAccountDeposits);
    const depToSave = { ...deposit, id: deposit.id || 'dep-' + Date.now() };
    const idx = list.findIndex(d => d.id === depToSave.id);

    if (idx >= 0) list[idx] = depToSave; else list.push(depToSave);
    setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, list);

    // Sync to Supabase
    Promise.resolve(supabase.from('account_deposits').upsert({
      id: depToSave.id,
      concept: depToSave.concept,
      amount: depToSave.amount || 0,
      date: depToSave.date,
      bank_name: depToSave.bankName || 'Santander',
      reference: depToSave.reference
    })).catch(err => console.error('Supabase Deposit save error:', err));

    storageService.logAudit(user, 'REGISTRAR_DEPOSITO_CUENTA', `${depToSave.concept} ($${depToSave.amount})`);
    return list;
  },
  deleteAccountDeposit: (id, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, initialAccountDeposits).filter(d => d.id !== id);
    setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, list);
    Promise.resolve(supabase.from('account_deposits').delete().eq('id', id)).catch(err => console.error('Supabase Deposit delete error:', err));
    storageService.logAudit(user, 'ELIMINAR_DEPOSITO_CUENTA', `ID ${id}`);
    return list;
  },

  // Other Income
  getOtherIncome: () => getStorageItem(STORAGE_KEYS.OTHER_INCOME, []),
  saveOtherIncome: (item, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.OTHER_INCOME, []);
    if (!item.id) item.id = 'oth_' + Date.now();
    const idx = list.findIndex(o => o.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    setStorageItem(STORAGE_KEYS.OTHER_INCOME, list);
    storageService.logAudit(user, 'GUARDAR_OTRO_INGRESO', item.concept);
    return list;
  },

  // Bank Accounts & Card Expenses
  getBankAccounts: () => getStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, []),
  saveBankAccount: (account) => {
    const list = getStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, []);
    if (!account.id) account.id = 'b_' + Date.now();
    const idx = list.findIndex(b => b.id === account.id);
    if (idx >= 0) list[idx] = account; else list.push(account);
    setStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, list);
    return list;
  },
  getCardExpenses: () => getStorageItem(STORAGE_KEYS.CARD_EXPENSES, []),
  saveCardExpense: (expense, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.CARD_EXPENSES, []);
    if (!expense.id) expense.id = 'exp_' + Date.now();
    const idx = list.findIndex(e => e.id === expense.id);
    if (idx >= 0) list[idx] = expense; else list.push(expense);
    setStorageItem(STORAGE_KEYS.CARD_EXPENSES, list);
    storageService.logAudit(user, 'REGISTRAR_GASTO_TARJETA', `$${expense.amount} - ${expense.bankName}`);
    return list;
  },

  // Investments
  getInvestments: () => getStorageItem(STORAGE_KEYS.INVESTMENTS, []),
  saveInvestment: (inv, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.INVESTMENTS, []);
    if (!inv.id) inv.id = 'inv_ast_' + Date.now();
    const idx = list.findIndex(i => i.id === inv.id);
    if (idx >= 0) list[idx] = inv; else list.push(inv);
    setStorageItem(STORAGE_KEYS.INVESTMENTS, list);
    storageService.logAudit(user, 'REGISTRAR_INVERSION', `${inv.assetName} ($${inv.amountInvested})`);
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
