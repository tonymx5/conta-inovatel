#!/usr/bin/env node
/**
 * CLI de Restablecimiento de PINs & Credenciales de Seguridad (ISO 27001)
 * Conta Inovatel — NEXUS Master Access CLI
 *
 * Uso:
 *   node scripts/reset-pin.js --user karla --pin 2020
 *   node scripts/reset-pin.js --user edson --pin 0808
 *   node scripts/reset-pin.js --user karla --pin 2020 --master "InovatelMaster2026!#"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const targetUser = (getArg('--user') || '').toLowerCase();
const newPin = getArg('--pin') || '';
const masterKey = getArg('--master') || 'InovatelMaster2026!#';

if (!targetUser || !newPin || args.includes('--help') || args.includes('-h')) {
  console.log(`
🔐 [CONTA INOVATEL] CLI de Gestión y Recuperación de PINs

Uso:
  node scripts/reset-pin.js --user <edson|karla> --pin <nuevo_pin> [--master <clave_maestra>]

Ejemplos:
  node scripts/reset-pin.js --user karla --pin 2020
  node scripts/reset-pin.js --user edson --pin 0808
  node scripts/reset-pin.js --user karla --pin 1234 --master "InovatelMaster2026!#"
  `);
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
}

if (!['karla', 'edson'].includes(targetUser)) {
  console.error('❌ Usuario inválido. Los usuarios permitidos son: edson, karla');
  process.exit(1);
}

if (newPin.trim().length < 4) {
  console.error('❌ El PIN debe tener al menos 4 caracteres.');
  process.exit(1);
}

// 1. Cargar variables de entorno
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
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY no configurado en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function runReset() {
  console.log(`\n🔑 Iniciando restablecimiento de PIN para usuario '${targetUser.toUpperCase()}'...`);
  const targetEmail = targetUser === 'karla' ? 'karla@inovatel.mx' : 'edson@inovatel.mx';

  // Intentar Método 1: Autenticación como Admin
  if (adminPin) {
    try {
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: 'edson@inovatel.mx',
        password: `ContaInovatel_Edson_${adminPin}#SecureAuth`
      });

      if (!loginErr) {
        const { data, error } = await supabase.rpc('admin_reset_user_pin', {
          p_target_email: targetEmail,
          p_new_pin: newPin.trim()
        });

        if (!error && data?.success) {
          console.log(`✅ [ÉXITO] ${data.message}`);
          console.log(`   Usuario: ${targetEmail}`);
          console.log(`   Nuevo PIN: ${newPin}`);
          process.exit(0);
        }
      }
    } catch {
      // Intentar método 2
    }
  }

  // Método 2: Recuperación vía Clave Maestra
  console.log('🔄 Ejecutando recuperación mediante Clave Maestra de Seguridad...');
  try {
    const { data: recData, error: recErr } = await supabase.rpc('recuperar_pin_con_master_key', {
      p_ip: 'cli-terminal-local',
      p_target_user: targetUser,
      p_master_key: masterKey,
      p_new_pin: newPin.trim()
    });

    if (recErr) {
      console.error('❌ Error en RPC de recuperación:', recErr.message);
      console.log('\n💡 Tip: Asegúrate de haber ejecutado "supabase_pin_reset_and_recovery.sql" en el SQL Editor de Supabase.');
      process.exit(1);
    }

    if (recData?.success) {
      console.log(`✅ [ÉXITO] ${recData.message}`);
      console.log(`   Usuario: ${targetEmail}`);
      console.log(`   Nuevo PIN: ${newPin}`);
      process.exit(0);
    } else {
      console.error(`❌ [FALLO] ${recData?.message || 'No se pudo restablecer el PIN.'}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Excepción de red/conexión:', err.message);
    process.exit(1);
  }
}

runReset();
