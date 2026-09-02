// LocalStorage & Supabase Dual-Sync Service for Conta Inovatel
import { supabase } from './supabaseClient.js';
import { formatFolio } from '../utils/folioFormatter.js';

const STORAGE_KEYS = {
  CLIENTS: 'conta_inovatel_clients',
  INVOICES: 'conta_inovatel_invoices',
  TAX_CONFIG: 'conta_inovatel_tax_config',
  DEDUCTIBLE_EXPENSES: 'conta_inovatel_deductibles',
  ACCOUNT_DEPOSITS: 'conta_inovatel_account_deposits',
  OTHER_INCOME: 'conta_inovatel_other_income',
  OTHER_EXPENSES: 'conta_inovatel_other_expenses',
  CARD_EXPENSES: 'conta_inovatel_card_expenses',
  BANK_ACCOUNTS: 'conta_inovatel_bank_accounts',
  INVESTMENTS: 'conta_inovatel_investments',
  AUDIT_LOGS: 'conta_inovatel_audit_logs',
  SECURITY_INCIDENTS: 'conta_inovatel_security_incidents',
  AGENDA_EVENTS: 'conta_inovatel_agenda_events'
};

// Clean legacy mock deposits from client localStorage if present
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const rawLocal = localStorage.getItem(STORAGE_KEYS.ACCOUNT_DEPOSITS);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        // Filtrar y eliminar depósitos fantasmas o mocks de prueba para que Edson inicie 100% limpio
        const cleaned = parsed.filter(d => {
          if (!d) return false;
          if (d.id === 'dep-aug-alvarado' || d.id === 'dep1' || d.id === 'dep2' || d.id === 'dep-1') return false;
          if (d.id && (d.id.startsWith('mock-') || d.id.startsWith('test-'))) return false;
          return true;
        });
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, JSON.stringify(cleaned));
        }
      }
    }
  }
} catch {
  // Ignore
}

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

  // Agosto 2026 (10 Facturas Reales Sincronizadas)
  { id: 'inv9', folio: 'FK-665', clientName: 'ALVARADOS', rfc: 'ALV190930PQR', date: '2026-08-04', subtotal: 35720.00, discount: 1786.00, baseNeta: 33934.00, ivaRate: 8, ivaTotal: 2714.72, appliesIsr: true, isrRate: 1.25, isrRetained: 424.18, total: 36224.54, status: 'PAGADA' },
  { id: 'inv-1787010186364', folio: 'FK-660', clientName: 'GRACIELA', rfc: 'GRA850410GHI', date: '2026-08-06', subtotal: 780.00, discount: 0, baseNeta: 780.00, ivaRate: 8, ivaTotal: 62.40, appliesIsr: false, isrRate: 1.25, isrRetained: 0.00, total: 842.40, status: 'PAGADA' },
  { id: 'inv10', folio: 'FK-659', clientName: 'JOINT', rfc: 'JOI190822ABC', date: '2026-08-10', subtotal: 6909.91, discount: 0, baseNeta: 6909.91, ivaRate: 8, ivaTotal: 552.79, appliesIsr: true, isrRate: 1.25, isrRetained: 86.37, total: 7376.33, status: 'PAGADA' },
  { id: 'inv-1787089235498', folio: 'FK-669', clientName: 'EDGAR SOTO', rfc: 'SOHE770725RB8', date: '2026-08-18', subtotal: 450.00, discount: 0, baseNeta: 450.00, ivaRate: 8, ivaTotal: 36.00, appliesIsr: false, isrRate: 1.25, isrRetained: 0.00, total: 486.00, status: 'PAGADA' },
  { id: 'inv-1787089782636', folio: 'FK-670', clientName: 'ELIZABEHT', rfc: 'EIAE790110M33', date: '2026-08-18', subtotal: 1235.00, discount: 0, baseNeta: 1235.00, ivaRate: 8, ivaTotal: 98.80, appliesIsr: false, isrRate: 1.25, isrRetained: 0.00, total: 1333.80, status: 'PAGADA' },
  { id: 'inv-1787090037247', folio: 'FK-671', clientName: 'ALVARADOS', rfc: 'ATR1305203T0', date: '2026-08-18', subtotal: 4000.00, discount: 0, baseNeta: 4000.00, ivaRate: 8, ivaTotal: 320.00, appliesIsr: true, isrRate: 1.25, isrRetained: 50.00, total: 4270.00, status: 'PAGADA' },
  { id: 'inv-1787684300187', folio: 'FK-679', clientName: 'ALVARADOS', rfc: 'ATR1305203T0', date: '2026-08-25', subtotal: 4000.00, discount: 0, baseNeta: 4000.00, ivaRate: 8, ivaTotal: 320.00, appliesIsr: true, isrRate: 1.25, isrRetained: 50.00, total: 4270.00, status: 'PAGADA' },
  { id: 'inv-1787684335620', folio: 'FK-680', clientName: 'ALVARADOS', rfc: 'ATR1305203T0', date: '2026-08-25', subtotal: 1000.00, discount: 0, baseNeta: 1000.00, ivaRate: 8, ivaTotal: 80.00, appliesIsr: true, isrRate: 1.25, isrRetained: 12.50, total: 1067.50, status: 'PAGADA' },
  { id: 'inv-1787789480309', folio: 'FK-681', clientName: 'GRACIELA', rfc: 'PEGG750422FZ7', date: '2026-08-26', subtotal: 18700.00, discount: 935.00, baseNeta: 17765.00, ivaRate: 8, ivaTotal: 1421.20, appliesIsr: false, isrRate: 1.25, isrRetained: 0.00, total: 19186.20, status: 'PAGADA' },
  { id: 'inv-1787873790682', folio: 'FK-682', clientName: 'RMS', rfc: 'RMS2504148E3', date: '2026-08-27', subtotal: 26320.00, discount: 0, baseNeta: 26320.00, ivaRate: 8, ivaTotal: 2105.60, appliesIsr: true, isrRate: 1.25, isrRetained: 329.00, total: 28096.60, status: 'PAGADA' }
];

const initialDeductibles = [
  { id: 'd-costco-1', providerName: 'Costco', rfc: 'COS910214ABC', invoiceNo: 'FACT-4412', date: '2026-08-17', subtotal: 413.19, discount: 0, ivaTotal: 66.11, total: 479.30, category: 'Papelería / Oficina' },
  { id: 'd-homedepot-1', providerName: 'Home Depot', rfc: 'HDE000315XYZ', invoiceNo: 'HD-99120', date: '2026-08-17', subtotal: 441.00, discount: 0, ivaTotal: 70.56, total: 511.56, category: 'Equipos & Telecomunicaciones' },
  { id: 'd3', providerName: 'SYSCOM (Computación y Telecomunicaciones)', rfc: 'STE940428KBA', invoiceNo: 'FA26/1441633', date: '2026-08-15', subtotal: 20326.80, discount: 0, ivaTotal: 3252.29, total: 23579.09, category: 'Equipos & Telecomunicaciones' },
  { id: 'd1', providerName: 'Office Depot', rfc: 'ODE930805B27', invoiceNo: 'PDF-9921', date: '2026-07-04', subtotal: 1250.00, discount: 0, ivaTotal: 200.00, total: 1450.00, category: 'Papelería / Oficina' },
  { id: 'd2', providerName: 'Telmex', rfc: 'EME8903099C7', invoiceNo: 'PDF-8812', date: '2026-07-12', subtotal: 860.00, discount: 0, ivaTotal: 137.60, total: 997.60, category: 'Telecomunicaciones' }
];

const initialAccountDeposits = [
  {
    id: 'dep-1787024787523',
    concept: 'Deposito Alvarado factura 665',
    amount: 32180.05,
    date: '2026-08-01',
    bankName: 'NU',
    reference: '4 agosto 2024',
    profile: 'karla',
    appliesEquipmentExpense: false,
    equipmentExpense: 0,
    equipmentProvider: '',
    realUtility: 32180.05
  },
  {
    id: 'dep-1787045393027',
    concept: 'Abono factura alvarado fact 665',
    amount: 32180.05,
    date: '2026-08-01',
    bankName: 'NU',
    reference: '4 agosto 2024',
    profile: 'edson',
    appliesEquipmentExpense: true,
    equipmentExpense: 21952.17,
    equipmentProvider: 'SYSCOM',
    realUtility: 10227.88
  },
  {
    id: 'dep-1787697151995',
    concept: '2da trasferencia',
    amount: 7647.99,
    date: '2026-08-01',
    bankName: 'NU',
    reference: '25 agosto',
    profile: 'karla',
    appliesEquipmentExpense: false,
    equipmentExpense: 0,
    equipmentProvider: '',
    realUtility: 7647.99
  },
  {
    id: 'dep-1787790432943',
    concept: '2da trasferencia',
    amount: 7647.99,
    date: '2026-08-01',
    bankName: 'NU',
    reference: '25 Agosto',
    profile: 'edson',
    appliesEquipmentExpense: false,
    equipmentExpense: 0,
    equipmentProvider: '',
    realUtility: 7647.99
  },
  {
    id: 'dep-1787876882071',
    concept: 'PAGO LAPTOP',
    amount: 16999.00,
    date: '2026-08-27',
    bankName: 'Santander',
    reference: 'SPEI-50813',
    profile: 'karla',
    appliesEquipmentExpense: false,
    equipmentExpense: 0,
    equipmentProvider: '',
    realUtility: 16999.00
  },
  {
    id: 'dep-1788129577104',
    concept: 'gastos varios',
    amount: 17023.07,
    date: '2026-08-30',
    bankName: 'NU',
    reference: 'SPEI-92621',
    profile: 'karla',
    appliesEquipmentExpense: false,
    equipmentExpense: 0,
    equipmentProvider: '',
    realUtility: 17023.07
  },
  {
    id: 'dep-1788380941103',
    concept: 'PAGO AGOSTO',
    amount: 17013.77,
    date: '2026-08-31',
    bankName: 'Santander',
    reference: 'SPEI-51233',
    profile: 'karla',
    appliesEquipmentExpense: false,
    equipmentExpense: 0,
    equipmentProvider: '',
    realUtility: 17013.77
  },
  {
    id: 'dep-1788381973743',
    concept: 'PAGO TOTAL AGOSTO',
    amount: 948.32,
    date: '2026-08-31',
    bankName: 'NU',
    reference: 'SPEI-24142',
    profile: 'karla',
    appliesEquipmentExpense: false,
    equipmentExpense: 0,
    equipmentProvider: '',
    realUtility: 948.32
  }
];

const initialCardExpenses = [
  { id: 'exp-aug-1', date: '2026-08-17', description: 'Consumos y Alimentos', amount: 462.00, bankId: 'b5', bankName: 'Banregio (Crédito)', sector: 'Comida' },
  { id: 'exp-aug-2', date: '2026-08-17', description: 'Entretenimiento y Ocio', amount: 892.50, bankId: 'b5', bankName: 'Banregio (Crédito)', sector: 'Ocio' },
  { id: 'exp-aug-3', date: '2026-08-17', description: 'Servicios y Software', amount: 2212.97, bankId: 'b5', bankName: 'Banregio (Crédito)', sector: 'Servicios' },
  { id: 'exp-aug-4', date: '2026-08-17', description: 'Insumos de Trabajo / Oficina', amount: 952.50, bankId: 'b5', bankName: 'Banregio (Crédito)', sector: 'Trabajo' }
];

const initialOtherExpenses = [
  { id: 'oth-exp-prime-ago', concept: 'prime agosto', amount: 99.00, date: '2026-08-17', userRole: 'ADMIN' }
];

const initialBankAccounts = [
  { id: 'b1', bankName: 'Santander', type: 'Débito', accountNumber: '**** 2740', balance: 0 },
  { id: 'b2', bankName: 'NU', type: 'Crédito', accountNumber: '**** 0712', balance: 0 },
  { id: 'b3', bankName: 'Stori', type: 'Crédito', accountNumber: '**** 1000', balance: 0 },
  { id: 'b4', bankName: 'Banregio', type: 'Débito', accountNumber: '**** 7699', balance: 0 },
  { id: 'b5', bankName: 'Banregio', type: 'Crédito', accountNumber: '**** 7699', balance: 0 },
  { id: 'b6', bankName: 'NU', type: 'Débito', accountNumber: '**** 6195', balance: 0 }
];

const initialAgendaEvents = [
  {
    id: 'evt-sat-mensual',
    title: 'Declaración Mensual SAT - Pago Provisional ISR / IVA',
    description: 'Presentación y pago de obligaciones fiscales correspondientes al mes vencido antes del día 17.',
    date: '2026-08-17',
    time: '12:00 PM',
    category: 'fiscal',
    colorTheme: 'red',
    completed: true,
    createdBy: 'edson'
  },
  {
    id: 'evt-syscom-pago',
    title: 'Pago Proveedor SYSCOM (Telecomunicaciones)',
    description: 'Liquidación de factura FA26/1441633 por equipos de cómputo y redes.',
    date: '2026-08-15',
    time: '01:30 PM',
    category: 'pago',
    colorTheme: 'blue',
    completed: true,
    createdBy: 'edson'
  },
  {
    id: 'evt-revision-cobranza',
    title: 'Revisión y Conciliación de Cobranza Clientes',
    description: 'Seguimiento de facturas FK-659 (Joint) y FK-665 (Alvarados) emitidas en el período.',
    date: '2026-08-20',
    time: '03:00 PM',
    category: 'general',
    colorTheme: 'yellow',
    completed: true,
    createdBy: 'karla'
  },
  {
    id: 'evt-cierre-nomina',
    title: 'Cierre de Quincena y Depósitos Operativos',
    description: 'Conciliación de depósitos bancarios brutos y registro de remanentes reales.',
    date: '2026-08-28',
    time: '03:45 PM',
    category: 'pago',
    colorTheme: 'green',
    completed: false,
    createdBy: 'edson'
  },
  {
    id: 'evt-estrategia-inversiones',
    title: 'Reunión de Estrategia Fiscal y Rendimientos IA',
    description: 'Evaluación de flujo libre para reinversión en CETES / Renta Fija y análisis de utilidades.',
    date: '2026-08-31',
    time: '04:30 PM',
    category: 'reunion',
    colorTheme: 'pink',
    completed: false,
    createdBy: 'edson'
  }
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

let lastSyncTimestamp = null;

function formatTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function notifyDataSynced(detail = {}) {
  lastSyncTimestamp = new Date();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('conta_data_synced', { 
      detail: { 
        timestamp: lastSyncTimestamp,
        timeStr: formatTime(lastSyncTimestamp),
        ...detail 
      } 
    }));
  }
}

// Global Realtime State, Polling & Event Handlers
let realtimeChannel = null;
let pollingIntervalId = null;
let currentSyncStatus = typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE_REALTIME' : 'OFFLINE';
const syncStatusListeners = new Set();

function setSyncStatus(status) {
  currentSyncStatus = status;
  syncStatusListeners.forEach(fn => {
    try { fn(status); } catch (e) { console.error('SyncStatus listener error:', e); }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('conta_sync_status_changed', { detail: status }));
  }
}

function mapInvoiceFromSupabase(i, localMap = new Map()) {
  const local = localMap.get(i.id);
  const subtotal = parseFloat(i.subtotal) || 0;
  const discount = parseFloat(i.discount) || 0;
  const baseNeta = parseFloat(i.base_neta) || Math.max(0, subtotal - discount);
  const ivaTotal = parseFloat(i.iva_total) || 0;
  const appliesIsr = i.applies_isr !== undefined && i.applies_isr !== null ? !!i.applies_isr : (local?.appliesIsr !== undefined ? !!local.appliesIsr : true);
  const isrRate = 1.25;
  const isrRetained = appliesIsr ? parseFloat((baseNeta * 0.0125).toFixed(2)) : 0;
  const total = parseFloat((baseNeta + ivaTotal - isrRetained).toFixed(2));

  return {
    id: i.id || local?.id || 'inv-' + Date.now(),
    folio: formatFolio(i.folio || local?.folio),
    clientName: i.client_name || i.clientName || local?.clientName || '',
    rfc: i.rfc || local?.rfc || '',
    date: i.date || local?.date || '',
    isMixedTax: i.is_mixed_tax !== undefined && i.is_mixed_tax !== null ? !!i.is_mixed_tax : (local?.isMixedTax || false),
    subtotal,
    discount,
    subtotal8: parseFloat(i.subtotal8) || 0,
    subtotal16: parseFloat(i.subtotal16) || 0,
    ivaRate: parseFloat(i.iva_rate) || 8,
    ivaTotal,
    appliesIsr,
    isrRate,
    isrRetained,
    baseNeta,
    total,
    status: i.status || 'PAGADA'
  };
}

function mapClientFromSupabase(c, localMap = new Map()) {
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
}

function mapDeductibleFromSupabase(d) {
  return {
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
  };
}

function mapDepositFromSupabase(dp, localMap = new Map()) {
  const amount = parseFloat(dp.amount) || 0;
  const existingLocal = localMap.get(dp.id);

  let appliesEquipmentExpense = false;
  if (dp.applies_equipment_expense !== undefined && dp.applies_equipment_expense !== null) {
    appliesEquipmentExpense = !!dp.applies_equipment_expense;
  } else if (existingLocal && existingLocal.appliesEquipmentExpense !== undefined) {
    appliesEquipmentExpense = !!existingLocal.appliesEquipmentExpense;
  } else if ((parseFloat(dp.equipment_expense) || 0) > 0) {
    appliesEquipmentExpense = true;
  }

  let equipmentExpense = 0;
  if (dp.equipment_expense !== undefined && dp.equipment_expense !== null) {
    equipmentExpense = parseFloat(dp.equipment_expense) || 0;
  } else if (existingLocal && existingLocal.equipmentExpense !== undefined) {
    equipmentExpense = parseFloat(existingLocal.equipmentExpense) || 0;
  }

  let equipmentProvider = dp.equipment_provider || dp.equipmentProvider || (existingLocal?.equipmentProvider || '');

  let realUtility = 0;
  if (dp.real_utility !== undefined && dp.real_utility !== null) {
    realUtility = parseFloat(dp.real_utility);
  } else if (existingLocal && existingLocal.realUtility !== undefined) {
    realUtility = parseFloat(existingLocal.realUtility);
  } else {
    realUtility = parseFloat((amount - (appliesEquipmentExpense ? equipmentExpense : 0)).toFixed(2));
  }

  // Perfil de depósito: 'edson' o 'karla' (por defecto resguarda como karla)
  let profile = dp.profile || (existingLocal?.profile);
  if (!profile || profile === 'usuario') {
    profile = 'karla';
  }

  return {
    id: dp.id,
    concept: dp.concept || (existingLocal?.concept || ''),
    amount,
    date: dp.date || (existingLocal?.date || ''),
    bankName: dp.bank_name || dp.bankName || (existingLocal?.bankName || 'Santander'),
    reference: dp.reference || (existingLocal?.reference || ''),
    appliesEquipmentExpense,
    equipmentExpense,
    equipmentProvider,
    realUtility,
    profile
  };
}

function mapCardExpenseFromSupabase(ce) {
  if (ce.bank_id === 'sync_other_expenses' || (ce.id && ce.id.startsWith('oth-exp-'))) {
    return null;
  }
  return {
    id: ce.id,
    date: ce.date,
    description: ce.description || '',
    amount: parseFloat(ce.amount) || 0,
    bankId: ce.bank_id || ce.bankId || 'b5',
    bankName: ce.bank_name || ce.bankName || 'Banregio (Crédito)',
    sector: ce.sector || 'Extras'
  };
}

function mapInvestmentFromSupabase(inv) {
  return {
    id: inv.id,
    assetName: inv.asset_name || inv.assetName || '',
    category: inv.category || 'CETES / Renta Fija',
    amountInvested: parseFloat(inv.amount_invested !== undefined ? inv.amount_invested : inv.amountInvested) || 0,
    expectedYieldPct: parseFloat(inv.expected_yield_pct !== undefined ? inv.expected_yield_pct : inv.expectedYieldPct) || 0,
    startDate: inv.start_date || inv.startDate || new Date().toISOString().split('T')[0],
    notes: inv.notes || ''
  };
}

function mapOtherExpenseFromSupabase(oe) {
  return {
    id: oe.id,
    concept: oe.concept || oe.description || '',
    amount: parseFloat(oe.amount) || 0,
    date: oe.date || new Date().toISOString().split('T')[0],
    userRole: oe.user_role || oe.sector || 'ADMIN'
  };
}

function mapAgendaEventFromSupabase(evt) {
  return {
    id: evt.id,
    title: evt.title || '',
    description: evt.description || '',
    date: evt.date || new Date().toISOString().split('T')[0],
    time: evt.time || '12:00 PM',
    category: evt.category || 'general',
    colorTheme: evt.color_theme || evt.colorTheme || 'blue',
    completed: !!evt.completed,
    createdBy: evt.created_by || evt.createdBy || 'usuario'
  };
}

export const storageService = {
  // Sync on startup from Supabase (Non-Destructive Protection)
  syncFromSupabase: async () => {
    try {
      const [invRes, cliRes, dedRes, depRes, taxRes, cardRes, investRes, otherExpRes, agendaRes] = await Promise.all([
        supabase.from('invoices').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('deductibles').select('*'),
        supabase.from('account_deposits').select('*'),
        supabase.from('tax_config').select('*').limit(1).single(),
        supabase.from('card_expenses').select('*'),
        supabase.from('investments').select('*'),
        supabase.from('other_expenses').select('*'),
        supabase.from('agenda_events').select('*').then(r => r).catch(() => ({ data: null }))
      ]);

      // 1. Invoices
      const localInvoices = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices);
      if (invRes.data && invRes.data.length > 0) {
        const localMap = new Map(localInvoices.map(i => [i.id, i]));
        const mappedInvoices = invRes.data.map(i => mapInvoiceFromSupabase(i, localMap));
        setStorageItem(STORAGE_KEYS.INVOICES, mappedInvoices);
      } else if (localInvoices && localInvoices.length > 0) {
        setStorageItem(STORAGE_KEYS.INVOICES, localInvoices);
        Promise.all(localInvoices.map(inv => supabase.from('invoices').upsert({
          id: inv.id, folio: inv.folio, client_name: inv.clientName, rfc: inv.rfc, date: inv.date,
          is_mixed_tax: !!inv.isMixedTax, subtotal: inv.subtotal || 0, discount: inv.discount || 0,
          subtotal8: inv.subtotal8 || 0, subtotal16: inv.subtotal16 || 0, iva_rate: inv.ivaRate || 8,
          iva_total: inv.ivaTotal || 0, applies_isr: !!inv.appliesIsr, isr_rate: inv.isrRate || 1.25,
          isr_retained: inv.isrRetained || 0, base_neta: inv.baseNeta || 0, total: inv.total || 0, status: inv.status || 'PAGADA'
        }))).catch(e => console.error('Seed invoices error:', e));
      }

      // 2. Clients
      const localClients = getStorageItem(STORAGE_KEYS.CLIENTS, initialClients);
      if (cliRes.data && cliRes.data.length > 0) {
        const localMap = new Map(localClients.map(c => [c.id, c]));
        const mappedClients = cliRes.data.map(c => mapClientFromSupabase(c, localMap));
        setStorageItem(STORAGE_KEYS.CLIENTS, mappedClients);
      } else if (localClients && localClients.length > 0) {
        setStorageItem(STORAGE_KEYS.CLIENTS, localClients);
        Promise.all(localClients.map(c => supabase.from('clients').upsert({
          id: c.id, name: c.name, rfc: c.rfc, email: c.email || null, phone: c.phone || null,
          sector: c.sector || null, notes: c.notes || null, applies_isr: c.appliesIsr, isr_rate: c.isrRate
        }))).catch(e => console.error('Seed clients error:', e));
      }

      // 3. Deductibles (Facturas Proveedores)
      const localDeds = getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, initialDeductibles);
      if (dedRes.data && dedRes.data.length > 0) {
        const mappedDeds = dedRes.data.map(d => mapDeductibleFromSupabase(d));
        localDeds.forEach(ld => {
          if (!mappedDeds.some(md => md.id === ld.id)) {
            mappedDeds.push(ld);
          }
        });
        setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, mappedDeds);
      } else if (localDeds && localDeds.length > 0) {
        setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, localDeds);
        Promise.all(localDeds.map(d => supabase.from('deductibles').upsert({
          id: d.id, provider_name: d.providerName, rfc: d.rfc, invoice_no: d.invoiceNo, date: d.date,
          subtotal: d.subtotal || 0, discount: d.discount || 0, iva_total: d.ivaTotal || 0, total: d.total || 0,
          category: d.category || 'Telecomunicaciones', file_name: d.fileName, file_url: d.fileUrl
        }))).catch(e => console.error('Seed deductibles error:', e));
      }

      // 4. Account Deposits (Direct Remote-First Sync with Local Metadata)
      const localDeps = getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, []);
      const localMap = new Map(localDeps.map(d => [d.id, d]));
      if (depRes.data) {
        const mappedDeps = depRes.data.map(dp => mapDepositFromSupabase(dp, localMap));
        setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, mappedDeps);
      }

      // 5. Card Expenses (Gastos por Tarjeta)
      const localCardExpenses = getStorageItem(STORAGE_KEYS.CARD_EXPENSES, initialCardExpenses);
      if (cardRes.data && cardRes.data.length > 0) {
        const mappedCards = cardRes.data.map(mapCardExpenseFromSupabase).filter(Boolean);
        setStorageItem(STORAGE_KEYS.CARD_EXPENSES, mappedCards);
      } else if (localCardExpenses && localCardExpenses.length > 0) {
        setStorageItem(STORAGE_KEYS.CARD_EXPENSES, localCardExpenses);
        Promise.all(localCardExpenses.map(ce => supabase.from('card_expenses').upsert({
          id: ce.id, date: ce.date, description: ce.description, amount: ce.amount || 0,
          bank_id: ce.bankId, bank_name: ce.bankName, sector: ce.sector || 'Extras'
        }))).catch(e => console.error('Seed card_expenses error:', e));
      }

      // 6. Investments (Inversiones & Bot IA)
      const localInvestments = getStorageItem(STORAGE_KEYS.INVESTMENTS, []);
      if (investRes.data && investRes.data.length > 0) {
        const mappedInvestments = investRes.data.map(mapInvestmentFromSupabase);
        setStorageItem(STORAGE_KEYS.INVESTMENTS, mappedInvestments);
      } else if (localInvestments && localInvestments.length > 0) {
        setStorageItem(STORAGE_KEYS.INVESTMENTS, localInvestments);
        Promise.all(localInvestments.map(inv => supabase.from('investments').upsert({
          id: inv.id, asset_name: inv.assetName, category: inv.category,
          amount_invested: inv.amountInvested || 0, expected_yield_pct: inv.expectedYieldPct || 0,
          start_date: inv.startDate, notes: inv.notes || ''
        }))).catch(e => console.error('Seed investments error:', e));
      }

      // 7. Other Expenses (Otros Gastos - Sincronizado en Nube)
      let syncedOtherExpenses = [];
      if (otherExpRes && otherExpRes.data && otherExpRes.data.length > 0) {
        syncedOtherExpenses = otherExpRes.data.map(mapOtherExpenseFromSupabase);
      } else if (cardRes && cardRes.data && cardRes.data.length > 0) {
        const extracted = cardRes.data
          .filter(c => c.bank_id === 'sync_other_expenses' || (c.id && c.id.startsWith('oth-exp-')))
          .map(mapOtherExpenseFromSupabase);
        if (extracted.length > 0) {
          syncedOtherExpenses = extracted;
        }
      }

      const localOtherExpenses = getStorageItem(STORAGE_KEYS.OTHER_EXPENSES, initialOtherExpenses);
      if (syncedOtherExpenses.length > 0) {
        localOtherExpenses.forEach(localItem => {
          if (!syncedOtherExpenses.some(s => s.id === localItem.id)) {
            syncedOtherExpenses.push(localItem);
          }
        });
        setStorageItem(STORAGE_KEYS.OTHER_EXPENSES, syncedOtherExpenses);
      } else if (localOtherExpenses && localOtherExpenses.length > 0) {
        setStorageItem(STORAGE_KEYS.OTHER_EXPENSES, localOtherExpenses);
      }

      // Dual sync propagation to ensure 100% remote persistence in all environments
      const currentList = getStorageItem(STORAGE_KEYS.OTHER_EXPENSES, initialOtherExpenses);
      Promise.all(currentList.map(async (oe) => {
        try {
          await supabase.from('other_expenses').upsert({
            id: oe.id, concept: oe.concept, amount: oe.amount || 0,
            date: oe.date, user_role: oe.userRole || 'ADMIN'
          });
        } catch {}

        try {
          await supabase.from('card_expenses').upsert({
            id: oe.id,
            date: oe.date,
            description: oe.concept,
            amount: oe.amount || 0,
            bank_id: 'sync_other_expenses',
            bank_name: 'Otros Gastos',
            sector: oe.userRole || 'ADMIN'
          });
        } catch {}
      })).catch(e => console.error('Seed other_expenses error:', e));

      // 8. Agenda Events (Calendario & Agenda)
      const localAgenda = getStorageItem(STORAGE_KEYS.AGENDA_EVENTS, initialAgendaEvents);
      if (agendaRes && agendaRes.data && agendaRes.data.length > 0) {
        const mappedAgenda = agendaRes.data.map(mapAgendaEventFromSupabase);
        setStorageItem(STORAGE_KEYS.AGENDA_EVENTS, mappedAgenda);
      } else if (localAgenda && localAgenda.length > 0) {
        setStorageItem(STORAGE_KEYS.AGENDA_EVENTS, localAgenda);
        Promise.all(localAgenda.map(evt => supabase.from('agenda_events').upsert({
          id: evt.id,
          title: evt.title,
          description: evt.description || '',
          date: evt.date,
          time: evt.time || '',
          category: evt.category || 'general',
          color_theme: evt.colorTheme || 'blue',
          completed: !!evt.completed,
          created_by: evt.createdBy || 'usuario'
        }))).catch(() => {});
      }

      if (taxRes && taxRes.data) {
        setStorageItem(STORAGE_KEYS.TAX_CONFIG, { isrEstimatedRate: parseFloat(taxRes.data.isr_estimated_rate) || 2.5 });
      }
    } catch (err) {
      console.warn('Supabase sync warning (running offline / local cache):', err);
    } finally {
      notifyDataSynced();
    }
  },

  // Realtime Subscriptions & Connection State
  initRealtimeSubscription: () => {
    if (typeof window === 'undefined') return;

    const handleOnline = async () => {
      setSyncStatus('RECONNECTING');
      await storageService.syncFromSupabase();
      setSyncStatus('ONLINE_REALTIME');
    };

    const handleOffline = () => {
      setSyncStatus('OFFLINE');
    };

    // Re-sincronización automática ultra-rápida al despertar la pestaña en celulares / laptops
    let lastWakeupSync = 0;
    const handleWakeup = async () => {
      const now = Date.now();
      if (now - lastWakeupSync < 3500) return; // Throttling de 3.5s
      lastWakeupSync = now;

      if (document.visibilityState === 'visible' && navigator.onLine) {
        setSyncStatus('RECONNECTING');
        try {
          await storageService.syncFromSupabase();
          setSyncStatus('ONLINE_REALTIME');
        } catch {
          setSyncStatus('ONLINE_REALTIME');
        }
      }
    };

    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleWakeup);
    window.removeEventListener('focus', handleWakeup);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleWakeup);

    if (!navigator.onLine) {
      setSyncStatus('OFFLINE');
      return;
    }

    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }

    setSyncStatus('ONLINE_REALTIME');

    realtimeChannel = supabase
      .channel('conta_realtime_sync_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        (payload) => {
          const list = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices);
          const localMap = new Map(list.map(item => [item.id, item]));

          if (payload.eventType === 'DELETE') {
            const newList = list.filter(item => item.id !== payload.old.id);
            setStorageItem(STORAGE_KEYS.INVOICES, newList);
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = mapInvoiceFromSupabase(payload.new, localMap);
            const idx = list.findIndex(i => i.id === mapped.id);
            if (idx >= 0) list[idx] = mapped; else list.unshift(mapped);
            setStorageItem(STORAGE_KEYS.INVOICES, list);
          }
          notifyDataSynced();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        (payload) => {
          const list = getStorageItem(STORAGE_KEYS.CLIENTS, initialClients);
          const localMap = new Map(list.map(item => [item.id, item]));

          if (payload.eventType === 'DELETE') {
            const newList = list.filter(item => item.id !== payload.old.id);
            setStorageItem(STORAGE_KEYS.CLIENTS, newList);
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = mapClientFromSupabase(payload.new, localMap);
            const idx = list.findIndex(c => c.id === mapped.id);
            if (idx >= 0) list[idx] = mapped; else list.unshift(mapped);
            setStorageItem(STORAGE_KEYS.CLIENTS, list);
          }
          notifyDataSynced();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deductibles' },
        (payload) => {
          const list = getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, initialDeductibles);
          if (payload.eventType === 'DELETE') {
            const newList = list.filter(item => item.id !== payload.old.id);
            setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, newList);
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = mapDeductibleFromSupabase(payload.new);
            const idx = list.findIndex(d => d.id === mapped.id);
            if (idx >= 0) list[idx] = mapped; else list.unshift(mapped);
            setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, list);
          }
          notifyDataSynced();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account_deposits' },
        (payload) => {
          const list = getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, initialAccountDeposits);
          const localMap = new Map(list.map(item => [item.id, item]));

          if (payload.eventType === 'DELETE') {
            const newList = list.filter(item => item.id !== payload.old.id);
            setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, newList);
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = mapDepositFromSupabase(payload.new, localMap);
            const idx = list.findIndex(dp => dp.id === mapped.id);
            if (idx >= 0) list[idx] = mapped; else list.unshift(mapped);
            setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, list);
          }
          notifyDataSynced();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'card_expenses' },
        (payload) => {
          const item = payload.new || payload.old;
          if (item && (item.bank_id === 'sync_other_expenses' || (item.id && String(item.id).startsWith('oth-exp-')))) {
            const list = getStorageItem(STORAGE_KEYS.OTHER_EXPENSES, initialOtherExpenses);
            if (payload.eventType === 'DELETE') {
              const newList = list.filter(e => e.id !== item.id);
              setStorageItem(STORAGE_KEYS.OTHER_EXPENSES, newList);
            } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const mapped = mapOtherExpenseFromSupabase(item);
              const idx = list.findIndex(oe => oe.id === mapped.id);
              if (idx >= 0) list[idx] = mapped; else list.unshift(mapped);
              setStorageItem(STORAGE_KEYS.OTHER_EXPENSES, list);
            }
            notifyDataSynced();
            return;
          }

          const list = getStorageItem(STORAGE_KEYS.CARD_EXPENSES, initialCardExpenses);
          if (payload.eventType === 'DELETE') {
            const newList = list.filter(item => item.id !== payload.old.id);
            setStorageItem(STORAGE_KEYS.CARD_EXPENSES, newList);
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = mapCardExpenseFromSupabase(payload.new);
            if (mapped) {
              const idx = list.findIndex(ce => ce.id === mapped.id);
              if (idx >= 0) list[idx] = mapped; else list.unshift(mapped);
              setStorageItem(STORAGE_KEYS.CARD_EXPENSES, list);
            }
          }
          notifyDataSynced();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'investments' },
        (payload) => {
          const list = getStorageItem(STORAGE_KEYS.INVESTMENTS, []);
          if (payload.eventType === 'DELETE') {
            const newList = list.filter(item => item.id !== payload.old.id);
            setStorageItem(STORAGE_KEYS.INVESTMENTS, newList);
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = mapInvestmentFromSupabase(payload.new);
            const idx = list.findIndex(inv => inv.id === mapped.id);
            if (idx >= 0) list[idx] = mapped; else list.unshift(mapped);
            setStorageItem(STORAGE_KEYS.INVESTMENTS, list);
          }
          notifyDataSynced();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tax_config' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (payload.new && payload.new.isr_estimated_rate) {
              setStorageItem(STORAGE_KEYS.TAX_CONFIG, { isrEstimatedRate: parseFloat(payload.new.isr_estimated_rate) || 2.5 });
              notifyDataSynced();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'other_expenses' },
        (payload) => {
          const list = getStorageItem(STORAGE_KEYS.OTHER_EXPENSES, initialOtherExpenses);
          if (payload.eventType === 'DELETE') {
            const newList = list.filter(item => item.id !== payload.old.id);
            setStorageItem(STORAGE_KEYS.OTHER_EXPENSES, newList);
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = mapOtherExpenseFromSupabase(payload.new);
            const idx = list.findIndex(oe => oe.id === mapped.id);
            if (idx >= 0) list[idx] = mapped; else list.unshift(mapped);
            setStorageItem(STORAGE_KEYS.OTHER_EXPENSES, list);
          }
          notifyDataSynced();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agenda_events' },
        (payload) => {
          const list = getStorageItem(STORAGE_KEYS.AGENDA_EVENTS, initialAgendaEvents);
          if (payload.eventType === 'DELETE') {
            const newList = list.filter(item => item.id !== payload.old.id);
            setStorageItem(STORAGE_KEYS.AGENDA_EVENTS, newList);
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = mapAgendaEventFromSupabase(payload.new);
            const idx = list.findIndex(e => e.id === mapped.id);
            if (idx >= 0) list[idx] = mapped; else list.unshift(mapped);
            setStorageItem(STORAGE_KEYS.AGENDA_EVENTS, list);
          }
          notifyDataSynced();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('ONLINE_REALTIME');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setSyncStatus('RECONNECTING');
        }
      });
  },

  unsubscribeRealtime: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  },

  // Polling Activo de 30 segundos (Heartbeat de Respaldo Multiperfil)
  startPolling: (intervalMs = 30000) => {
    if (typeof window === 'undefined') return;
    if (pollingIntervalId) clearInterval(pollingIntervalId);

    pollingIntervalId = setInterval(async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        try {
          await storageService.syncFromSupabase();
        } catch (e) {
          console.warn('Polling sync warning:', e);
        }
      }
    }, intervalMs);
  },

  stopPolling: () => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
  },

  getLastSyncTime: () => formatTime(lastSyncTimestamp),
  getLastSyncTimestamp: () => lastSyncTimestamp,
  getSyncStatus: () => currentSyncStatus,
  onSyncStatusChange: (callback) => {
    syncStatusListeners.add(callback);
    callback(currentSyncStatus);
    return () => syncStatusListeners.delete(callback);
  },

  // Config
  getTaxConfig: () => getStorageItem(STORAGE_KEYS.TAX_CONFIG, { isrEstimatedRate: 2.5 }),
  saveTaxConfig: async (config) => {
    setStorageItem(STORAGE_KEYS.TAX_CONFIG, config);
    try {
      await supabase.from('tax_config').upsert({
        id: 'default',
        isr_estimated_rate: config.isrEstimatedRate,
        last_updated: new Date().toISOString()
      });
    } catch (err) {
      console.error('Supabase TaxConfig error:', err);
    }
    notifyDataSynced({ action: 'saveTaxConfig' });
  },

  // Clients
  getClients: () => getStorageItem(STORAGE_KEYS.CLIENTS, initialClients),
  saveClient: async (client, user = 'admin') => {
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

    try {
      const { error } = await supabase.from('clients').upsert({
        id: clientToSave.id,
        name: clientToSave.name,
        rfc: clientToSave.rfc,
        email: clientToSave.email || null,
        phone: clientToSave.phone || null,
        sector: clientToSave.sector || null,
        notes: clientToSave.notes || null,
        applies_isr: clientToSave.appliesIsr,
        isr_rate: clientToSave.isrRate
      });
      if (error) {
        if (error.message?.includes('column') || error.code === 'PGRST204') {
          await supabase.from('clients').upsert({
            id: clientToSave.id,
            name: clientToSave.name,
            rfc: clientToSave.rfc,
            email: clientToSave.email || null,
            phone: clientToSave.phone || null,
            sector: clientToSave.sector || null,
            notes: clientToSave.notes || null
          });
        } else {
          console.error('Supabase Client save error:', error);
        }
      }
    } catch (err) {
      console.error('Supabase Client network error:', err);
    }

    if (existingIndex >= 0) {
      clients[existingIndex] = clientToSave;
    } else {
      clients.push(clientToSave);
    }
    setStorageItem(STORAGE_KEYS.CLIENTS, clients);

    storageService.logAudit(user, existingIndex >= 0 ? 'EDITAR_CLIENTE' : 'CREAR_CLIENTE', `${clientToSave.name} (${clientToSave.rfc}) - ISR: ${clientToSave.appliesIsr ? `${clientToSave.isrRate}%` : 'NO'}`);
    notifyDataSynced({ action: 'saveClient', id: clientToSave.id });
    return clients;
  },
  deleteClient: async (id, user = 'admin') => {
    try {
      await supabase.from('clients').delete().eq('id', id);
    } catch (err) {
      console.error('Supabase Client delete error:', err);
    }
    const clients = getStorageItem(STORAGE_KEYS.CLIENTS, initialClients).filter(c => c.id !== id);
    setStorageItem(STORAGE_KEYS.CLIENTS, clients);
    storageService.logAudit(user, 'ELIMINAR_CLIENTE', `ID ${id}`);
    notifyDataSynced({ action: 'deleteClient', id });
    return clients;
  },

  // Invoices
  getInvoices: () => {
    const list = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices);
    return list.map(inv => {
      const subtotal = parseFloat(inv.subtotal) || 0;
      const discount = parseFloat(inv.discount) || 0;
      const baseNeta = inv.baseNeta !== undefined ? parseFloat(inv.baseNeta) : Math.max(0, subtotal - discount);
      const ivaTotal = parseFloat(inv.ivaTotal) || 0;
      const appliesIsr = inv.appliesIsr !== false;
      const isrRetained = appliesIsr ? parseFloat((baseNeta * 0.0125).toFixed(2)) : 0;
      const total = parseFloat((baseNeta + ivaTotal - isrRetained).toFixed(2));
      return {
        ...inv,
        folio: formatFolio(inv.folio),
        baseNeta,
        isrRate: 1.25,
        isrRetained,
        total
      };
    });
  },
  saveInvoice: async (invoice, user = 'admin') => {
    const invoices = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices);
    const existingIndex = invoices.findIndex(i => i.id === invoice.id);
    const updatedInvoice = { 
      ...invoice, 
      id: invoice.id || 'inv-' + Date.now(),
      folio: formatFolio(invoice.folio)
    };

    // 1. Guardar primero en Supabase (RPC Atómica transaccional con Fallback a Upsert)
    try {
      const payload = {
        p_id: updatedInvoice.id,
        p_folio: updatedInvoice.folio,
        p_client_name: updatedInvoice.clientName,
        p_rfc: updatedInvoice.rfc,
        p_date: updatedInvoice.date,
        p_is_mixed_tax: !!updatedInvoice.isMixedTax,
        p_subtotal: updatedInvoice.subtotal || 0,
        p_discount: updatedInvoice.discount || 0,
        p_subtotal8: updatedInvoice.subtotal8 || 0,
        p_subtotal16: updatedInvoice.subtotal16 || 0,
        p_iva_rate: updatedInvoice.ivaRate || 8,
        p_iva_total: updatedInvoice.ivaTotal || 0,
        p_applies_isr: !!updatedInvoice.appliesIsr,
        p_isr_rate: updatedInvoice.isrRate || 1.25,
        p_isr_retained: updatedInvoice.isrRetained || 0,
        p_base_neta: updatedInvoice.baseNeta || 0,
        p_total: updatedInvoice.total || 0,
        p_status: updatedInvoice.status || 'PAGADA'
      };

      const { error: rpcError } = await supabase.rpc('crear_factura_completa', payload);

      if (rpcError) {
        // Fallback transparente a direct upsert si la RPC no existe o está en transición
        const { error: upsertError } = await supabase.from('invoices').upsert({
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
        });
        if (upsertError) {
          console.error('Supabase Invoice save error:', upsertError);
        }
      }
    } catch (err) {
      console.error('Supabase Invoice save network error:', err);
    }

    if (existingIndex >= 0) {
      invoices[existingIndex] = updatedInvoice;
    } else {
      invoices.unshift(updatedInvoice);
    }
    setStorageItem(STORAGE_KEYS.INVOICES, invoices);

    storageService.logAudit(user, existingIndex >= 0 ? 'EDITAR_FACTURA' : 'CREAR_FACTURA', `Factura ${updatedInvoice.folio} (${updatedInvoice.clientName})`);
    notifyDataSynced({ action: 'saveInvoice', id: updatedInvoice.id, invoice: updatedInvoice });
    return invoices;
  },
  deleteInvoice: async (id, user = 'admin') => {
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) console.error('Supabase Invoice delete error:', error);
    } catch (err) {
      console.error('Supabase Invoice delete network error:', err);
    }

    const invoices = getStorageItem(STORAGE_KEYS.INVOICES, initialInvoices).filter(i => i.id !== id);
    setStorageItem(STORAGE_KEYS.INVOICES, invoices);
    storageService.logAudit(user, 'ELIMINAR_FACTURA', `ID ${id}`);
    notifyDataSynced({ action: 'deleteInvoice', id });
    return invoices;
  },

  // Deductibles (Fact Prov)
  getDeductibles: () => getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, initialDeductibles),
  getDeductibleExpenses: () => getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, initialDeductibles),
  saveDeductible: async (item, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, initialDeductibles);
    const itemToSave = { ...item, id: item.id || 'ded-' + Date.now() };
    const idx = list.findIndex(d => d.id === itemToSave.id);

    try {
      const payload = {
        p_id: itemToSave.id,
        p_provider_name: itemToSave.providerName,
        p_rfc: itemToSave.rfc,
        p_invoice_no: itemToSave.invoiceNo,
        p_date: itemToSave.date,
        p_subtotal: itemToSave.subtotal || 0,
        p_discount: itemToSave.discount || 0,
        p_iva_total: itemToSave.ivaTotal || 0,
        p_total: itemToSave.total || 0,
        p_category: itemToSave.category || 'Telecomunicaciones',
        p_file_name: itemToSave.fileName || null,
        p_file_url: itemToSave.fileUrl || null
      };

      const { error: rpcError } = await supabase.rpc('crear_deducible_completo', payload);

      if (rpcError) {
        const { error } = await supabase.from('deductibles').upsert({
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
        });
        if (error) console.error('Supabase Deductible save error:', error);
      }
    } catch (err) {
      console.error('Supabase Deductible network error:', err);
    }

    if (idx >= 0) list[idx] = itemToSave; else list.unshift(itemToSave);
    setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, list);

    storageService.logAudit(user, 'GUARDAR_DEDUCCION_PROVEEDOR', `${itemToSave.providerName} - IVA $${itemToSave.ivaTotal}`);
    notifyDataSynced({ action: 'saveDeductible', id: itemToSave.id });
    return list;
  },
  deleteDeductible: async (id, user = 'admin') => {
    try {
      await supabase.from('deductibles').delete().eq('id', id);
    } catch (err) {
      console.error('Supabase Deductible delete error:', err);
    }
    const list = getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, initialDeductibles).filter(d => d.id !== id);
    setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, list);
    storageService.logAudit(user, 'ELIMINAR_DEDUCCION', `ID ${id}`);
    notifyDataSynced({ action: 'deleteDeductible', id });
    return list;
  },

  // Account Deposits (Depósitos a Cuenta / Transferencias)
  getAccountDeposits: () => getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, initialAccountDeposits),
  saveAccountDeposit: async (deposit, user = 'admin') => {
    const list = storageService.getAccountDeposits();
    const amount = parseFloat(deposit.amount) || 0;
    const profile = deposit.profile || (user === 'admin' || user === 'ADMIN' ? 'edson' : 'karla');
    const appliesEquipmentExpense = profile === 'edson' ? !!deposit.appliesEquipmentExpense : false;
    const equipmentExpense = (profile === 'edson' && appliesEquipmentExpense) ? (parseFloat(deposit.equipmentExpense) || 0) : 0;
    const realUtility = parseFloat((amount - equipmentExpense).toFixed(2));

    const depToSave = {
      ...deposit,
      id: deposit.id || 'dep-' + Date.now(),
      amount,
      appliesEquipmentExpense,
      equipmentExpense,
      equipmentProvider: profile === 'edson' ? (deposit.equipmentProvider || '').trim() : '',
      realUtility,
      profile
    };

    try {
      const payload = {
        p_id: depToSave.id,
        p_concept: depToSave.concept,
        p_amount: depToSave.amount,
        p_date: depToSave.date,
        p_bank_name: depToSave.bankName || 'Santander',
        p_reference: depToSave.reference || null,
        p_applies_equipment_expense: depToSave.appliesEquipmentExpense,
        p_equipment_expense: depToSave.equipmentExpense,
        p_equipment_provider: depToSave.equipmentProvider || null,
        p_real_utility: depToSave.realUtility,
        p_profile: depToSave.profile
      };

      const { error: rpcError } = await supabase.rpc('crear_deposito_completo', payload);

      if (rpcError) {
        const res = await supabase.from('account_deposits').upsert({
          id: depToSave.id,
          concept: depToSave.concept,
          amount: depToSave.amount,
          date: depToSave.date,
          bank_name: depToSave.bankName || 'Santander',
          reference: depToSave.reference,
          applies_equipment_expense: depToSave.appliesEquipmentExpense,
          equipment_expense: depToSave.equipmentExpense,
          equipment_provider: depToSave.equipmentProvider,
          real_utility: depToSave.realUtility,
          profile: depToSave.profile
        });
        if (res?.error) {
          await supabase.from('account_deposits').upsert({
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
          });
        }
      }
    } catch (e) {
      console.error('Supabase deposit save error:', e);
    }

    const idx = list.findIndex(d => d.id === depToSave.id);
    if (idx >= 0) list[idx] = depToSave; else list.unshift(depToSave);
    setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, list);

    storageService.logAudit(user, 'REGISTRAR_DEPOSITO_CUENTA', `[${profile.toUpperCase()}] ${depToSave.concept} ($${depToSave.amount}) | Utilidad Real: $${depToSave.realUtility}`);
    notifyDataSynced({ action: 'saveAccountDeposit', id: depToSave.id });
    return list;
  },
  deleteAccountDeposit: async (id, user = 'admin') => {
    try {
      await supabase.from('account_deposits').delete().eq('id', id);
    } catch (err) {
      console.error('Supabase Deposit Delete Error:', err);
    }
    const list = storageService.getAccountDeposits().filter(d => d.id !== id);
    setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, list);

    storageService.logAudit(user, 'ELIMINAR_DEPOSITO_CUENTA', `ID ${id}`);
    notifyDataSynced({ action: 'deleteAccountDeposit', id });
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
    notifyDataSynced({ action: 'saveOtherIncome', id: itemToSave.id });
    return list;
  },
  deleteOtherIncome: (id, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.OTHER_INCOME, []).filter(o => o.id !== id);
    setStorageItem(STORAGE_KEYS.OTHER_INCOME, list);
    storageService.logAudit(user, 'ELIMINAR_OTRO_INGRESO', `ID ${id}`);
    notifyDataSynced({ action: 'deleteOtherIncome', id });
    return list;
  },

  // Otros Gastos (Ingresos del Mes)
  getOtherExpenses: () => getStorageItem(STORAGE_KEYS.OTHER_EXPENSES, initialOtherExpenses),
  saveOtherExpense: async (expense, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.OTHER_EXPENSES, initialOtherExpenses);
    const amount = parseFloat(expense.amount) || 0;
    const itemToSave = {
      ...expense,
      id: expense.id || 'oth-exp-' + Date.now(),
      concept: (expense.concept || '').trim(),
      amount,
      date: expense.date || new Date().toISOString().split('T')[0],
      userRole: user
    };

    try {
      await Promise.all([
        supabase.from('other_expenses').upsert({
          id: itemToSave.id,
          concept: itemToSave.concept,
          amount: itemToSave.amount,
          date: itemToSave.date,
          user_role: itemToSave.userRole
        }),
        supabase.from('card_expenses').upsert({
          id: itemToSave.id,
          date: itemToSave.date,
          description: itemToSave.concept,
          amount: itemToSave.amount,
          bank_id: 'sync_other_expenses',
          bank_name: 'Otros Gastos',
          sector: itemToSave.userRole
        })
      ]);
    } catch (err) {
      console.error('Supabase Other Expense sync error:', err);
    }

    const idx = list.findIndex(e => e.id === itemToSave.id);
    if (idx >= 0) list[idx] = itemToSave; else list.unshift(itemToSave);
    setStorageItem(STORAGE_KEYS.OTHER_EXPENSES, list);

    storageService.logAudit(user, idx >= 0 ? 'EDITAR_OTRO_GASTO' : 'CREAR_OTRO_GASTO', `${itemToSave.concept} - $${itemToSave.amount}`);
    notifyDataSynced({ action: 'saveOtherExpense', id: itemToSave.id });
    return list;
  },
  deleteOtherExpense: async (id, user = 'admin') => {
    try {
      await Promise.all([
        supabase.from('other_expenses').delete().eq('id', id),
        supabase.from('card_expenses').delete().eq('id', id)
      ]);
    } catch (err) {
      console.error('Supabase delete other_expense error:', err);
    }

    const list = getStorageItem(STORAGE_KEYS.OTHER_EXPENSES, initialOtherExpenses).filter(e => e.id !== id);
    setStorageItem(STORAGE_KEYS.OTHER_EXPENSES, list);
    storageService.logAudit(user, 'ELIMINAR_OTRO_GASTO', `ID ${id}`);
    notifyDataSynced({ action: 'deleteOtherExpense', id });
    return list;
  },

  // Bank Accounts & Card Expenses
  getBankAccounts: () => {
    const list = getStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, initialBankAccounts);
    const map = new Map();
    initialBankAccounts.forEach(b => map.set(b.id, b));
    (list || []).forEach(b => map.set(b.id, b));
    const mergedList = Array.from(map.values());
    setStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, mergedList);
    return mergedList;
  },
  saveBankAccount: (account) => {
    const list = storageService.getBankAccounts();
    const bankToSave = { ...account, id: account.id || 'b_' + Date.now() };
    const idx = list.findIndex(b => b.id === bankToSave.id);
    if (idx >= 0) list[idx] = bankToSave; else list.push(bankToSave);
    setStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, list);
    notifyDataSynced({ action: 'saveBankAccount', id: bankToSave.id });
    return list;
  },
  deleteBankAccount: (id) => {
    const list = storageService.getBankAccounts().filter(b => b.id !== id);
    setStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, list);
    notifyDataSynced({ action: 'deleteBankAccount', id });
    return list;
  },
  getCardExpenses: () => {
    const list = getStorageItem(STORAGE_KEYS.CARD_EXPENSES, initialCardExpenses);
    const map = new Map();
    initialCardExpenses.forEach(e => map.set(e.id, e));
    (list || []).forEach(e => {
      if (e.bankId !== 'sync_other_expenses' && e.bank_id !== 'sync_other_expenses' && !(e.id && String(e.id).startsWith('oth-exp-'))) {
        map.set(e.id, e);
      }
    });
    const mergedList = Array.from(map.values());
    setStorageItem(STORAGE_KEYS.CARD_EXPENSES, mergedList);
    return mergedList;
  },
  saveCardExpense: async (expense, user = 'admin') => {
    const list = storageService.getCardExpenses();
    const expToSave = { ...expense, id: expense.id || 'exp_' + Date.now() };
    const idx = list.findIndex(e => e.id === expToSave.id);

    try {
      await supabase.from('card_expenses').upsert({
        id: expToSave.id,
        date: expToSave.date,
        description: expToSave.description,
        amount: expToSave.amount || 0,
        bank_id: expToSave.bankId || 'b5',
        bank_name: expToSave.bankName || 'Banregio (Crédito)',
        sector: expToSave.sector || 'Extras'
      });
    } catch (err) {
      console.error('Supabase card_expense save error:', err);
    }

    if (idx >= 0) list[idx] = expToSave; else list.unshift(expToSave);
    setStorageItem(STORAGE_KEYS.CARD_EXPENSES, list);

    storageService.logAudit(user, 'REGISTRAR_GASTO_TARJETA', `$${expToSave.amount} - ${expToSave.bankName}`);
    notifyDataSynced({ action: 'saveCardExpense', id: expToSave.id });
    return list;
  },
  deleteCardExpense: async (id, user = 'admin') => {
    try {
      await supabase.from('card_expenses').delete().eq('id', id);
    } catch (err) {
      console.error('Supabase card_expense delete error:', err);
    }
    const list = storageService.getCardExpenses().filter(e => e.id !== id);
    setStorageItem(STORAGE_KEYS.CARD_EXPENSES, list);
    storageService.logAudit(user, 'ELIMINAR_GASTO_TARJETA', `ID ${id}`);
    notifyDataSynced({ action: 'deleteCardExpense', id });
    return list;
  },

  // Investments
  getInvestments: () => getStorageItem(STORAGE_KEYS.INVESTMENTS, []),
  saveInvestment: async (inv, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.INVESTMENTS, []);
    const invToSave = { ...inv, id: inv.id || 'inv_ast_' + Date.now() };
    const idx = list.findIndex(i => i.id === invToSave.id);

    try {
      await supabase.from('investments').upsert({
        id: invToSave.id,
        asset_name: invToSave.assetName,
        category: invToSave.category || 'CETES / Renta Fija',
        amount_invested: invToSave.amountInvested || 0,
        expected_yield_pct: invToSave.expectedYieldPct || 0,
        start_date: invToSave.startDate,
        notes: invToSave.notes || ''
      });
    } catch (err) {
      console.error('Supabase investment save error:', err);
    }

    if (idx >= 0) list[idx] = invToSave; else list.unshift(invToSave);
    setStorageItem(STORAGE_KEYS.INVESTMENTS, list);

    storageService.logAudit(user, 'REGISTRAR_INVERSION', `${invToSave.assetName} ($${invToSave.amountInvested})`);
    notifyDataSynced({ action: 'saveInvestment', id: invToSave.id });
    return list;
  },
  deleteInvestment: async (id, user = 'admin') => {
    try {
      await supabase.from('investments').delete().eq('id', id);
    } catch (err) {
      console.error('Supabase investment delete error:', err);
    }
    const list = getStorageItem(STORAGE_KEYS.INVESTMENTS, []).filter(i => i.id !== id);
    setStorageItem(STORAGE_KEYS.INVESTMENTS, list);
    storageService.logAudit(user, 'ELIMINAR_INVERSION', `ID ${id}`);
    notifyDataSynced({ action: 'deleteInvestment', id });
    return list;
  },

  // Agenda & Calendar Events
  getAgendaEvents: () => getStorageItem(STORAGE_KEYS.AGENDA_EVENTS, initialAgendaEvents),
  saveAgendaEvent: async (eventData, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.AGENDA_EVENTS, initialAgendaEvents);
    const evtToSave = {
      id: eventData.id || 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: eventData.title || '',
      description: eventData.description || '',
      date: eventData.date || new Date().toISOString().split('T')[0],
      time: eventData.time || '12:00 PM',
      category: eventData.category || 'general',
      colorTheme: eventData.colorTheme || 'blue',
      completed: !!eventData.completed,
      createdBy: eventData.createdBy || (user === 'admin' ? 'edson' : 'karla')
    };

    try {
      await supabase.from('agenda_events').upsert({
        id: evtToSave.id,
        title: evtToSave.title,
        description: evtToSave.description,
        date: evtToSave.date,
        time: evtToSave.time,
        category: evtToSave.category,
        color_theme: evtToSave.colorTheme,
        completed: evtToSave.completed,
        created_by: evtToSave.createdBy
      });
    } catch (err) {
      console.warn('Supabase agenda save warning:', err.message);
    }

    const idx = list.findIndex(e => e.id === evtToSave.id);
    if (idx >= 0) list[idx] = evtToSave; else list.unshift(evtToSave);
    setStorageItem(STORAGE_KEYS.AGENDA_EVENTS, list);

    storageService.logAudit(user, idx >= 0 ? 'ACTUALIZAR_EVENTO_AGENDA' : 'REGISTRAR_EVENTO_AGENDA', `${evtToSave.title} (${evtToSave.date})`);
    notifyDataSynced({ action: 'saveAgendaEvent', id: evtToSave.id });
    return list;
  },
  deleteAgendaEvent: async (id, user = 'admin') => {
    try {
      await supabase.from('agenda_events').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase agenda delete warning:', err.message);
    }
    const list = getStorageItem(STORAGE_KEYS.AGENDA_EVENTS, initialAgendaEvents).filter(e => e.id !== id);
    setStorageItem(STORAGE_KEYS.AGENDA_EVENTS, list);
    storageService.logAudit(user, 'ELIMINAR_EVENTO_AGENDA', `ID ${id}`);
    notifyDataSynced({ action: 'deleteAgendaEvent', id });
    return list;
  },
  toggleAgendaEventStatus: async (id, user = 'admin') => {
    const list = getStorageItem(STORAGE_KEYS.AGENDA_EVENTS, initialAgendaEvents);
    const item = list.find(e => e.id === id);
    if (item) {
      item.completed = !item.completed;
      setStorageItem(STORAGE_KEYS.AGENDA_EVENTS, list);

      try {
        await supabase.from('agenda_events').update({ completed: item.completed }).eq('id', id);
      } catch (err) {
        console.warn('Supabase agenda status update warning:', err.message);
      }

      storageService.logAudit(user, item.completed ? 'COMPLETAR_EVENTO_AGENDA' : 'REABRIR_EVENTO_AGENDA', item.title);
      notifyDataSynced({ action: 'toggleAgendaEventStatus', id });
    }
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
  },

  // Supabase Storage Integration (Prevención de TOAST Bloat & Persistencia de Comprobantes)
  uploadComprobanteStorage: async (file, pathPrefix = 'comprobantes') => {
    if (!file) return { success: false, error: 'No file provided' };
    try {
      const ext = file.name ? file.name.split('.').pop() : 'pdf';
      const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = `${pathPrefix}/${cleanName}`;

      const { error } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.warn('Supabase Storage upload warning (fallback a referencia local):', error.message);
        return { success: false, fileName: file.name, error: error.message };
      }

      const { data: publicUrlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(filePath);

      return {
        success: true,
        fileName: file.name,
        storagePath: filePath,
        fileUrl: publicUrlData?.publicUrl || ''
      };
    } catch (err) {
      console.warn('Storage exception:', err);
      return { success: false, fileName: file?.name || '', error: err.message };
    }
  },

  // 1-Click Full Backup Exporter (Non-Destructive Snapshot ISO 27001 Ready)
  exportFullBackupJSON: () => storageService.exportFullBackup(),
  exportFullBackup: () => {
    try {
      const backupData = {
        metadata: {
          system: 'Conta Inovatel',
          version: '2.8',
          standard: 'NEXUS MASTER v2.8 (ISO 27001 Ready)',
          exportDate: new Date().toISOString(),
          totalInvoices: (getStorageItem(STORAGE_KEYS.INVOICES, [])).length,
          totalClients: (getStorageItem(STORAGE_KEYS.CLIENTS, [])).length,
          totalDeductibles: (getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, [])).length,
          totalDeposits: (getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, [])).length,
          totalAgendaEvents: (getStorageItem(STORAGE_KEYS.AGENDA_EVENTS, [])).length,
          totalCardExpenses: (getStorageItem(STORAGE_KEYS.CARD_EXPENSES, [])).length,
          totalInvestments: (getStorageItem(STORAGE_KEYS.INVESTMENTS, [])).length
        },
        invoices: getStorageItem(STORAGE_KEYS.INVOICES, []),
        clients: getStorageItem(STORAGE_KEYS.CLIENTS, []),
        deductibles: getStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, []),
        accountDeposits: getStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, []),
        taxConfig: getStorageItem(STORAGE_KEYS.TAX_CONFIG, {}),
        otherIncome: getStorageItem(STORAGE_KEYS.OTHER_INCOME, []),
        otherExpenses: getStorageItem(STORAGE_KEYS.OTHER_EXPENSES, []),
        bankAccounts: getStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, []),
        cardExpenses: getStorageItem(STORAGE_KEYS.CARD_EXPENSES, []),
        investments: getStorageItem(STORAGE_KEYS.INVESTMENTS, []),
        agendaEvents: getStorageItem(STORAGE_KEYS.AGENDA_EVENTS, []),
        auditLogs: getStorageItem(STORAGE_KEYS.AUDIT_LOGS, [])
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `conta_inovatel_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      storageService.logAudit('ADMIN', 'EXPORTAR_RESPALDO_SISTEMA', 'Respaldo completo descargado exitosamente');
      return true;
    } catch (e) {
      console.error('Export Backup Error:', e);
      return false;
    }
  },

  // 1-Click Backup Importer & Restorer (Safe Cloud Sync)
  importFullBackup: async (backupData, user = 'admin') => {
    try {
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('Formato de archivo de respaldo inválido.');
      }

      if (Array.isArray(backupData.invoices)) {
        setStorageItem(STORAGE_KEYS.INVOICES, backupData.invoices);
        Promise.all(backupData.invoices.map(inv => supabase.from('invoices').upsert({
          id: inv.id, folio: inv.folio, client_name: inv.clientName, rfc: inv.rfc, date: inv.date,
          is_mixed_tax: !!inv.isMixedTax, subtotal: inv.subtotal || 0, discount: inv.discount || 0,
          subtotal8: inv.subtotal8 || 0, subtotal16: inv.subtotal16 || 0, iva_rate: inv.ivaRate || 8,
          iva_total: inv.ivaTotal || 0, applies_isr: !!inv.appliesIsr, isr_rate: inv.isrRate || 1.25,
          isr_retained: inv.isrRetained || 0, base_neta: inv.baseNeta || 0, total: inv.total || 0, status: inv.status || 'PAGADA'
        }))).catch(e => console.error('Restore invoices error:', e));
      }

      if (Array.isArray(backupData.clients)) {
        setStorageItem(STORAGE_KEYS.CLIENTS, backupData.clients);
        Promise.all(backupData.clients.map(c => supabase.from('clients').upsert({
          id: c.id, name: c.name, rfc: c.rfc, email: c.email || null, phone: c.phone || null,
          sector: c.sector || null, notes: c.notes || null, applies_isr: c.appliesIsr, isr_rate: c.isrRate
        }))).catch(e => console.error('Restore clients error:', e));
      }

      if (Array.isArray(backupData.deductibles)) {
        setStorageItem(STORAGE_KEYS.DEDUCTIBLE_EXPENSES, backupData.deductibles);
        Promise.all(backupData.deductibles.map(d => supabase.from('deductibles').upsert({
          id: d.id, provider_name: d.providerName, rfc: d.rfc, invoice_no: d.invoiceNo, date: d.date,
          subtotal: d.subtotal || 0, discount: d.discount || 0, iva_total: d.ivaTotal || 0, total: d.total || 0,
          category: d.category || 'Telecomunicaciones', file_name: d.fileName, file_url: d.fileUrl
        }))).catch(e => console.error('Restore deductibles error:', e));
      }

      if (Array.isArray(backupData.accountDeposits)) {
        setStorageItem(STORAGE_KEYS.ACCOUNT_DEPOSITS, backupData.accountDeposits);
        Promise.all(backupData.accountDeposits.map(dp => supabase.from('account_deposits').upsert({
          id: dp.id, concept: dp.concept, amount: dp.amount || 0, date: dp.date,
          bank_name: dp.bankName || 'Santander', reference: dp.reference || '',
          applies_equipment_expense: !!dp.appliesEquipmentExpense,
          equipment_expense: dp.equipmentExpense || 0,
          equipment_provider: dp.equipmentProvider || '',
          real_utility: dp.realUtility !== undefined ? dp.realUtility : (dp.amount || 0),
          profile: dp.profile || 'karla'
        }))).catch(e => console.error('Restore deposits error:', e));
      }

      if (Array.isArray(backupData.cardExpenses)) {
        setStorageItem(STORAGE_KEYS.CARD_EXPENSES, backupData.cardExpenses);
        Promise.all(backupData.cardExpenses.map(ce => supabase.from('card_expenses').upsert({
          id: ce.id, date: ce.date, description: ce.description, amount: ce.amount || 0,
          bank_id: ce.bankId, bank_name: ce.bankName, sector: ce.sector || 'Extras'
        }))).catch(e => console.error('Restore card_expenses error:', e));
      }

      if (Array.isArray(backupData.investments)) {
        setStorageItem(STORAGE_KEYS.INVESTMENTS, backupData.investments);
        Promise.all(backupData.investments.map(inv => supabase.from('investments').upsert({
          id: inv.id, asset_name: inv.assetName, category: inv.category,
          amount_invested: inv.amountInvested || 0, expected_yield_pct: inv.expectedYieldPct || 0,
          start_date: inv.startDate, notes: inv.notes || ''
        }))).catch(e => console.error('Restore investments error:', e));
      }

      if (Array.isArray(backupData.agendaEvents)) {
        setStorageItem(STORAGE_KEYS.AGENDA_EVENTS, backupData.agendaEvents);
        Promise.all(backupData.agendaEvents.map(evt => supabase.from('agenda_events').upsert({
          id: evt.id,
          title: evt.title,
          description: evt.description || '',
          date: evt.date,
          time: evt.time || '',
          category: evt.category || 'general',
          color_theme: evt.colorTheme || 'blue',
          completed: !!evt.completed,
          created_by: evt.createdBy || 'usuario'
        }))).catch(e => console.error('Restore agenda error:', e));
      }

      if (backupData.taxConfig) {
        setStorageItem(STORAGE_KEYS.TAX_CONFIG, backupData.taxConfig);
        if (backupData.taxConfig.isrEstimatedRate) {
          try {
            await supabase.from('tax_config').upsert({
              id: 'default',
              isr_estimated_rate: backupData.taxConfig.isrEstimatedRate,
              last_updated: new Date().toISOString()
            });
          } catch (e) {
            console.error('Restore tax_config error:', e);
          }
        }
      }

      if (Array.isArray(backupData.otherIncome)) {
        setStorageItem(STORAGE_KEYS.OTHER_INCOME, backupData.otherIncome);
      }
      if (Array.isArray(backupData.otherExpenses)) {
        setStorageItem(STORAGE_KEYS.OTHER_EXPENSES, backupData.otherExpenses);
      }
      if (Array.isArray(backupData.bankAccounts)) {
        setStorageItem(STORAGE_KEYS.BANK_ACCOUNTS, backupData.bankAccounts);
      }

      storageService.logAudit(user, 'RESTAURAR_RESPALDO_SISTEMA', `Respaldo restaurado (${backupData.metadata?.exportDate || 'fecha desconocida'})`);
      notifyDataSynced();
      return { success: true };
    } catch (e) {
      console.error('Import Backup Error:', e);
      return { success: false, error: e.message };
    }
  }
};

