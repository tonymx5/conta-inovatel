// Script de Auditoría de Base de Datos Supabase en Tiempo Real (NEXUS v2.6)
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

const TABLES_TO_AUDIT = [
  'invoices',
  'clients',
  'deductibles',
  'account_deposits',
  'tax_config',
  'audit_logs'
];

async function auditSupabase() {
  console.log(`\n🔍 Iniciando Auditoría Activa de Supabase en: ${supabaseUrl}`);
  let hasErrors = false;

  for (const table of TABLES_TO_AUDIT) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
        headers,
        method: 'GET'
      });

      if (response.status >= 200 && response.status < 300) {
        const data = await response.json();
        const colCount = data.length > 0 ? Object.keys(data[0]).length : 'N/A';
        console.log(`  ✓ Tabla '${table}': OK (HTTP ${response.status}) | ${data.length} reg. leídos (${colCount} cols)`);
      } else {
        const errText = await response.text();
        console.error(`  ❌ Tabla '${table}': FALLO HTTP ${response.status} -> ${errText}`);
        hasErrors = true;
      }
    } catch (err) {
      console.error(`  ❌ Tabla '${table}': Error de Conexión ->`, err.message);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n❌ AUDITORÍA FALLIDA: Existen tablas o conexiones inactivas en Supabase.\n');
    process.exit(1);
  } else {
    console.log('\n✅ AUDITORÍA DE BASE DE DATOS COMPLETADA: Todas las tablas responden HTTP 200 OK en Supabase.\n');
    process.exit(0);
  }
}

auditSupabase();
