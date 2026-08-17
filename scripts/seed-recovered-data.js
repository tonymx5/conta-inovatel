// Script de Restauración y Semilla de Datos Recuperados en Supabase
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
let supabaseUrl = 'https://jyhuvmqibfvmfutcvzhw.supabase.co';
let anonKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey = line.split('=')[1].trim();
  });
}

const headers = {
  'apikey': anonKey,
  'Authorization': `Bearer ${anonKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const recoveredDeposits = [
  {
    id: 'dep-aug-alvarado',
    concept: 'Deposito Alvarado 665',
    amount: 32180.05,
    date: '2026-08-04',
    bank_name: 'Santander',
    reference: 'SPEI-99201',
    applies_equipment_expense: true,
    equipment_expense: 21952.17,
    equipment_provider: 'SYSCOM',
    real_utility: 10227.88
  },
  {
    id: 'dep1',
    concept: 'Transferencia Cobro Factura FK-101 (JOINT)',
    amount: 7479.41,
    date: '2026-07-02',
    bank_name: 'Santander',
    reference: 'SPEI-88192',
    applies_equipment_expense: false,
    equipment_expense: 0,
    equipment_provider: '',
    real_utility: 7479.41
  },
  {
    id: 'dep2',
    concept: 'Transferencia Cobro Factura FK-106 (ALVARADOS)',
    amount: 4270.00,
    date: '2026-07-12',
    bank_name: 'Santander',
    reference: 'SPEI-44910',
    applies_equipment_expense: false,
    equipment_expense: 0,
    equipment_provider: '',
    real_utility: 4270.00
  }
];

const recoveredDeductibles = [
  {
    id: 'd-costco-1',
    provider_name: 'Costco',
    rfc: 'COS910214ABC',
    invoice_no: 'FACT-4412',
    date: '2026-08-17',
    subtotal: 413.19,
    discount: 0,
    iva_total: 66.11,
    total: 479.30,
    category: 'Papelería / Oficina'
  },
  {
    id: 'd-homedepot-1',
    provider_name: 'Home Depot',
    rfc: 'HDE000315XYZ',
    invoice_no: 'HD-99120',
    date: '2026-08-17',
    subtotal: 441.00,
    discount: 0,
    iva_total: 70.56,
    total: 511.56,
    category: 'Equipos & Telecomunicaciones'
  },
  {
    id: 'd3',
    provider_name: 'SYSCOM (Computación y Telecomunicaciones)',
    rfc: 'STE940428KBA',
    invoice_no: 'FA26/1441633',
    date: '2026-08-15',
    subtotal: 20326.80,
    discount: 0,
    iva_total: 3252.29,
    total: 23579.09,
    category: 'Equipos & Telecomunicaciones'
  }
];

async function seedRecoveredData() {
  console.log('🚀 Restaurando y sembrando registros recuperados en Supabase...');

  // 1. Account Deposits
  for (const dep of recoveredDeposits) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/account_deposits`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(dep)
      });
      if (res.ok) {
        console.log(`  ✓ Depósito restaurado: ${dep.concept} ($${dep.amount} | Utilidad: $${dep.real_utility})`);
      } else {
        const errText = await res.text();
        console.warn(`  ⚠️ Intento con columnas completas: ${errText}`);
        // Fallback standard columns
        const fallbackRes = await fetch(`${supabaseUrl}/rest/v1/account_deposits`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({
            id: dep.id, concept: dep.concept, amount: dep.amount, date: dep.date, bank_name: dep.bank_name, reference: dep.reference
          })
        });
        if (fallbackRes.ok) console.log(`  ✓ Depósito estandar restaurado: ${dep.concept}`);
      }
    } catch (e) {
      console.error('Error restaurando deposito:', e);
    }
  }

  // 2. Deductibles
  for (const ded of recoveredDeductibles) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/deductibles`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(ded)
      });
      if (res.ok) {
        console.log(`  ✓ Deducción restaurada: ${ded.provider_name} ($${ded.total})`);
      }
    } catch (e) {
      console.error('Error restaurando deduccion:', e);
    }
  }

  console.log('\n✅ Proceso de restauración completado.');
}

seedRecoveredData();
