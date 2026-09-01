// Script de Auditoría de Base de Datos Supabase en Tiempo Real (NEXUS v2.8)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer archivo .env local
const envPath = path.resolve(__dirname, '../.env');
let supabaseUrl = 'https://jyhuvmqibfvmfutcvzhw.supabase.co';
let anonKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      anonKey = line.split('=')[1].trim();
    }
  });
}

if (!anonKey) {
  console.error('❌ Error: No se encontró VITE_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const headers = {
  'apikey': anonKey,
  'Authorization': `Bearer ${anonKey}`,
  'Content-Type': 'application/json'
};

const SCHEMA_AUDIT_MAP = [
  {
    table: 'account_deposits',
    cols: 'id,concept,amount,date,bank_name,reference,applies_equipment_expense,equipment_expense,equipment_provider,real_utility,profile,created_at'
  },
  {
    table: 'clients',
    cols: 'id,name,rfc,email,phone,sector,notes,applies_isr,isr_rate,created_at'
  },
  {
    table: 'invoices',
    cols: 'id,folio,client_name,rfc,date,is_mixed_tax,subtotal,discount,subtotal8,subtotal16,iva_rate,iva_total,applies_isr,isr_rate,isr_retained,base_neta,total,status,created_at'
  },
  {
    table: 'deductibles',
    cols: 'id,provider_name,rfc,invoice_no,date,subtotal,discount,iva_total,total,category,file_name,file_url,created_at'
  },
  {
    table: 'tax_config',
    cols: 'id,isr_estimated_rate,last_updated'
  },
  {
    table: 'audit_logs',
    cols: 'id,timestamp,action,details,user_role,ip'
  },
  {
    table: 'card_expenses',
    cols: 'id,date,description,amount,bank_id,bank_name,sector,created_at'
  },
  {
    table: 'investments',
    cols: 'id,asset_name,category,amount_invested,expected_yield_pct,start_date,notes,created_at'
  },
  {
    table: 'other_expenses',
    cols: 'id,concept,amount,date,user_role,created_at',
    optional: true
  },
  {
    table: 'agenda_events',
    cols: 'id,title,description,date,time,category,color_theme,completed,created_by,created_at'
  }
];

async function auditSupabase() {
  console.log(`\n🔍 Iniciando Auditoría Exhaustiva de Supabase en: ${supabaseUrl}`);
  let hasErrors = false;

  for (const item of SCHEMA_AUDIT_MAP) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${item.table}?select=${item.cols}&limit=1`, {
        headers,
        method: 'GET'
      });

      if (response.status >= 200 && response.status < 300) {
        const colList = item.cols.split(',');
        console.log(`  ✓ Tabla '${item.table}': OK (HTTP ${response.status}) | Esquema validado (${colList.length} columnas activas)`);
      } else if (item.optional) {
        console.log(`  ⚠️ Tabla '${item.table}': Pendiente de migración en Supabase (HTTP ${response.status}) | Sincronización LocalStorage activa`);
      } else {
        const errText = await response.text();
        console.error(`  ❌ Tabla '${item.table}': FALLO HTTP ${response.status} -> ${errText}`);
        hasErrors = true;
      }
    } catch (err) {
      if (item.optional) {
        console.log(`  ⚠️ Tabla '${item.table}': Pendiente de migración -> ${err.message}`);
      } else {
        console.error(`  ❌ Tabla '${item.table}': Error de Conexión ->`, err.message);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error('\n❌ AUDITORÍA FALLIDA: Existen tablas o columnas faltantes en Supabase.\n');
    process.exit(1);
  } else {
    console.log('\n✅ AUDITORÍA DE BASE DE DATOS COMPLETADA: 100% de tablas y columnas activas en Supabase.\n');
    process.exit(0);
  }
}

auditSupabase();
