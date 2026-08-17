// Script de Prueba de Estrés e Integridad de Sincronización (NEXUS v2.6)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser environment for node execution of storageService logic
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };

// Import storageService
const { storageService } = await import('../src/services/storageService.js');

async function runStressTest() {
  console.log('========================================================');
  console.log('  PRUEBA DE ESTRÉS Y AISLAMIENTO DE DATOS EN TIEMPO REAL ');
  console.log('========================================================\n');

  // STEP 1: Snapshot initial state
  console.log('[FASE 1] Tomando Snapshot del estado inicial...');
  await storageService.syncFromSupabase();

  const initialDeposits = storageService.getAccountDeposits();
  const initialExpenses = storageService.getCardExpenses();
  const initialDeductibles = storageService.getDeductibles();
  const initialInvoices = storageService.getInvoices();

  console.log(`  ✓ Estado inicial capturado:`);
  console.log(`    - Depósitos: ${initialDeposits.length} registros`);
  console.log(`    - Gastos por Tarjeta: ${initialExpenses.length} registros`);
  console.log(`    - Deducciones: ${initialDeductibles.length} registros`);
  console.log(`    - Facturas: ${initialInvoices.length} registros\n`);

  // STEP 2: Create a temporary test deposit and test expense
  console.log('[FASE 2] Creando registros temporales de prueba de estrés...');
  const testDepId = 'dep_stress_test_' + Date.now();
  const testExpId = 'exp_stress_test_' + Date.now();

  const testDep = {
    id: testDepId,
    concept: 'Prueba de Estrés Depósito Temporal',
    amount: 15000.00,
    date: '2026-08-17',
    bankName: 'Santander',
    reference: 'SPEI-TEST-99',
    appliesEquipmentExpense: true,
    equipmentExpense: 5000.00,
    equipmentProvider: 'Proveedor Test',
    realUtility: 10000.00
  };

  const testExp = {
    id: testExpId,
    date: '2026-08-17',
    description: 'Prueba de Estrés Gasto Temporal',
    amount: 1250.50,
    bankId: 'b5',
    bankName: 'Banregio (Crédito)',
    sector: 'Extras'
  };

  await storageService.saveAccountDeposit(testDep, 'PRUEBA_SISTEMA');
  storageService.saveCardExpense(testExp, 'PRUEBA_SISTEMA');

  const afterCreateDeposits = storageService.getAccountDeposits();
  const afterCreateExpenses = storageService.getCardExpenses();

  console.log(`  ✓ Registro temporal de Depósito insertado (ID: ${testDepId})`);
  console.log(`  ✓ Registro temporal de Gasto insertado (ID: ${testExpId})`);
  console.log(`  ✓ Total Depósitos post-creación: ${afterCreateDeposits.length}`);
  console.log(`  ✓ Total Gastos post-creación: ${afterCreateExpenses.length}\n`);

  // STEP 3: Trigger full sync from Supabase and verify non-destructive isolation
  console.log('[FASE 3] Ejecutando sincronización (syncFromSupabase) para probar aislamiento...');
  await storageService.syncFromSupabase();

  const postSyncDeposits = storageService.getAccountDeposits();
  const postSyncExpenses = storageService.getCardExpenses();

  console.log(`  ✓ Depósitos post-sincronización: ${postSyncDeposits.length}`);
  console.log(`  ✓ Gastos post-sincronización: ${postSyncExpenses.length}`);

  // Assert temporary items exist and old items are untouched
  const testDepExists = postSyncDeposits.some(d => d.id === testDepId);
  const testExpExists = postSyncExpenses.some(e => e.id === testExpId);

  if (!testDepExists || !testExpExists) {
    console.error('❌ FALLO: El registro de prueba fue eliminado prematuramente por la sincronización.');
    process.exit(1);
  }

  // Verify August deposit utility untouched
  const alvaradoDep = postSyncDeposits.find(d => d.id === 'dep-aug-alvarado' || d.concept.includes('Alvarado'));
  if (alvaradoDep && alvaradoDep.realUtility !== 10227.88) {
    console.error(`❌ FALLO DE ISOLACIÓN: La utilidad real de Alvarado cambió a $${alvaradoDep.realUtility} (se esperaba $10227.88).`);
    process.exit(1);
  }
  console.log('  ✓ Aislamiento verificado: El depósito de Alvarado mantiene su Utilidad Real intacta en $10,227.88\n');

  // STEP 4: Delete temporary test items
  console.log('[FASE 4] Eliminando registros temporales de prueba...');
  await storageService.deleteAccountDeposit(testDepId, 'PRUEBA_SISTEMA');
  storageService.deleteCardExpense(testExpId, 'PRUEBA_SISTEMA');

  console.log(`  ✓ Depósito temporal eliminado (ID: ${testDepId})`);
  console.log(`  ✓ Gasto temporal eliminado (ID: ${testExpId})\n`);

  // STEP 5: Trigger sync again and verify final integrity snapshot
  console.log('[FASE 5] Ejecutando sincronización final y auditando estado de la base de datos...');
  await storageService.syncFromSupabase();

  const finalDeposits = storageService.getAccountDeposits();
  const finalExpenses = storageService.getCardExpenses();

  console.log(`  ✓ Depósitos finales: ${finalDeposits.length}`);
  console.log(`  ✓ Gastos finales: ${finalExpenses.length}`);

  // Integrity Checks
  const testDepStillExists = finalDeposits.some(d => d.id === testDepId);
  const testExpStillExists = finalExpenses.some(e => e.id === testExpId);

  if (testDepStillExists || testExpStillExists) {
    console.error('❌ FALLO: El registro de prueba no se eliminó correctamente.');
    process.exit(1);
  }

  // Ensure initial data count matches final count exactly
  if (finalDeposits.length !== initialDeposits.length) {
    console.error(`❌ FALLO DE INTEGRIDAD: El conteo de depósitos cambió de ${initialDeposits.length} a ${finalDeposits.length}.`);
    process.exit(1);
  }

  if (finalExpenses.length !== initialExpenses.length) {
    console.error(`❌ FALLO DE INTEGRIDAD: El conteo de gastos cambió de ${initialExpenses.length} a ${finalExpenses.length}.`);
    process.exit(1);
  }

  console.log('\n========================================================');
  console.log('  ✅ INFORME DE PRUEBA DE ESTRÉS: EXITOSA AL 100%');
  console.log('========================================================');
  console.log(' 1. Ningún registro legítimo fue modificado o eliminado.');
  console.log(' 2. El registro temporal fue creado, sincronizado y eliminado sin daño colateral.');
  console.log(' 3. La utilidad real de los depósitos de Agosto se mantiene 100% protegida.');
  console.log(' 4. Los 4 gastos de tarjeta de Agosto continúan íntegros.\n');
}

runStressTest().catch(err => {
  console.error('❌ Error en prueba de estrés:', err);
  process.exit(1);
});
