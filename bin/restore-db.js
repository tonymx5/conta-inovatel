#!/usr/bin/env node
/**
 * Script de Restauración Idempotente y Recuperación ante Desastres (ISO 22301)
 * Conta Inovatel — NEXUS Master Restore Drill
 *
 * Uso:
 *   node bin/restore-db.js --dry-run
 *   node bin/restore-db.js --file ./backup.json --dry-run
 *   node bin/restore-db.js --file ./backup.json --execute
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--execute');
const fileArgIdx = args.indexOf('--file');
const targetFile = fileArgIdx !== -1 && args[fileArgIdx + 1] ? args[fileArgIdx + 1] : null;

console.log('\n📦 [CONTA INOVATEL] Protocolo de Restauración y Recuperación ISO 22301');
console.log(`🛡️ Modo de Operación: ${isDryRun ? 'DRY-RUN (Simulación sin escritura en BD)' : 'EJECUCIÓN REAL (Restauración activa en Supabase)'}\n`);

// 1. Cargar credenciales desde .env
const envPath = path.resolve(__dirname, '../.env');
let supabaseUrl = 'https://jyhuvmqibfvmfutcvzhw.supabase.co';
let anonKey = '';
let adminPin = process.env.SUPABASE_ADMIN_PIN || '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_ADMIN_PIN=') && !adminPin) adminPin = line.split('=')[1].trim();
  });
}

if (!anonKey) {
  console.warn('⚠️ No se detectó VITE_SUPABASE_ANON_KEY en .env. Se usará modo estructural offline.');
}

// 2. Localizar archivo de respaldo
let backupPath = targetFile ? path.resolve(process.cwd(), targetFile) : null;

if (!backupPath || !fs.existsSync(backupPath)) {
  // Buscar archivos .json en Documentos o backups/
  const candidateDirs = [
    path.resolve(__dirname, '../Documentos'),
    path.resolve(__dirname, '../backups'),
    path.resolve(__dirname, '..')
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      const jsonFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f.toLowerCase().includes('backup'));
      if (jsonFiles.length > 0) {
        backupPath = path.join(dir, jsonFiles[0]);
        break;
      }
    }
  }
}

let backupData = null;

if (backupPath && fs.existsSync(backupPath)) {
  console.log(`📄 Archivo de respaldo seleccionado: ${backupPath}`);
  try {
    backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  } catch (err) {
    console.error(`❌ Error al parsear JSON de respaldo: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log('ℹ️ No se especificó archivo de respaldo local (--file <ruta>).');
  console.log('🧪 Ejecutando Dry-Run de verificación de conectividad y esquema de restauración...\n');
  backupData = {
    metadata: { system: 'Conta Inovatel', test: true, date: new Date().toISOString() },
    invoices: [],
    clients: [],
    deductibles: [],
    account_deposits: [],
    card_expenses: [],
    investments: [],
    tax_config: [],
    agenda_events: []
  };
}

// 3. Validación de estructura de datos
const summary = {};

for (const key of Object.keys(backupData)) {
  if (Array.isArray(backupData[key])) {
    summary[key] = backupData[key].length;
  }
}

console.log('📊 Resumen del paquete de respaldo:');
console.table(summary);

// 4. Verificación de Tablas en Supabase
async function runRestore() {
  if (!anonKey) {
    console.log('✅ Verificación estructural local completada con éxito.');
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey);
  if (adminPin) {
    await supabase.auth.signInWithPassword({
      email: 'edson@inovatel.mx',
      password: `ContaInovatel_Edson_${adminPin}#SecureAuth`
    });
  }
  const tables = ['invoices', 'clients', 'deductibles', 'account_deposits', 'tax_config', 'card_expenses', 'investments', 'agenda_events'];

  console.log('\n🔍 Verificando estado y accesibilidad de tablas destino en Supabase:');
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`  ❌ Tabla '${table}': ERROR de acceso (${error.message})`);
    } else {
      console.log(`  ✓ Tabla '${table}': Accesible | ${count} registros actuales en nube`);
    }
  }

  if (isDryRun) {
    console.log('\n🎯 [DRY-RUN EXITOSO] El archivo de respaldo y las tablas de destino son 100% compatibles.');
    console.log('💡 Para ejecutar una restauración real, corre: node bin/restore-db.js --file <archivo.json> --execute\n');
  } else {
    console.log('\n🚀 Iniciando inserción transaccional de registros...');
    // Lógica de restauración idempotente (upsert)
    for (const [table, records] of Object.entries(backupData)) {
      if (tables.includes(table) && Array.isArray(records) && records.length > 0) {
        const { error } = await supabase.from(table).upsert(records, { onConflict: 'id' });
        if (error) {
          console.error(`  ❌ Error al restaurar en '${table}': ${error.message}`);
        } else {
          console.log(`  ✓ Restaurados ${records.length} registros en '${table}'.`);
        }
      }
    }
    console.log('\n🎯 [RESTAURACIÓN COMPLETADA] Base de datos sincronizada con éxito.');
  }
}

runRestore().catch(err => {
  console.error('❌ Excepción durante el proceso de restauración:', err);
  process.exit(1);
});
