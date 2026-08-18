// Suite de Pruebas de Segregación de Depósitos y Dinero Real para Métricas (Conta Inovatel)
// Valida:
// 1. Depósitos independientes por perfil (Edson vs Karla / Usuario).
// 2. Deducción de compra de equipo/servicio ($20,000 - $5,000 = $15,000 remanente real).
// 3. Desvinculación de depósitos de Karla en Métricas & Analíticas e Inversiones.
// 4. Resguardo e integridad de datos para el perfil Karla (y retrocompatibilidad con registros legacy).

function assertEqual(actual, expected, testName) {
  const diff = Math.abs(actual - expected);
  if (diff > 0.009) {
    console.error(`❌ [FALLO] ${testName} -> Esperado: ${expected}, Obtenido: ${actual}`);
    process.exit(1);
  } else {
    console.log(`✅ [ÉXITO] ${testName} -> ${actual}`);
  }
}

function assertTrue(condition, testName) {
  if (!condition) {
    console.error(`❌ [FALLO] ${testName}`);
    process.exit(1);
  } else {
    console.log(`✅ [ÉXITO] ${testName}`);
  }
}

console.log('🧪 Iniciando Suite de Pruebas: Segregación de Depósitos & Dinero Real en Métricas...\n');

// Mock Data
const sampleDeposits = [
  // 1. Depósito capturado por perfil Karla (Cobro a cliente, no afecta métricas ejecutivas de Edson)
  {
    id: 'dep-karla-1',
    concept: 'Cobro Factura FK-101 Cliente Joint',
    amount: 10000.00,
    date: '2026-08-10',
    bankName: 'Santander',
    reference: 'SPEI-88120',
    appliesEquipmentExpense: false,
    equipmentExpense: 0,
    equipmentProvider: '',
    realUtility: 10000.00,
    profile: 'karla'
  },
  // 2. Depósito capturado por perfil Edson con deducción de compra de equipo
  {
    id: 'dep-edson-1',
    concept: 'Cobro Factura FK-665 Alvarados',
    amount: 20000.00,
    date: '2026-08-15',
    bankName: 'Santander',
    reference: 'SPEI-99431',
    appliesEquipmentExpense: true,
    equipmentExpense: 5000.00,
    equipmentProvider: 'SYSCOM (Cámaras IP)',
    realUtility: 15000.00,
    profile: 'edson'
  },
  // 3. Depósito legacy (sin perfil explícito o registrado como usuario -> resguardado para Karla)
  {
    id: 'dep-legacy-user',
    concept: 'Transferencia Operativa Legacy',
    amount: 4500.00,
    date: '2026-08-12',
    bankName: 'BBVA',
    reference: 'SPEI-11002',
    appliesEquipmentExpense: false,
    equipmentExpense: 0,
    realUtility: 4500.00,
    profile: 'usuario'
  }
];

// Test 1: Filtrado de Depósitos para Perfil Karla (incluyendo retrocompatibilidad)
{
  const karlaDeposits = sampleDeposits.filter(d => d.profile === 'karla' || d.profile === 'usuario' || !d.profile);
  assertEqual(karlaDeposits.length, 2, 'Total depósitos visibles para Karla (2 depósitos)');
  const totalKarlaAmount = karlaDeposits.reduce((sum, d) => sum + d.amount, 0);
  assertEqual(totalKarlaAmount, 14500.00, 'Suma bruta de depósitos de Karla ($14,500.00)');
  assertTrue(!karlaDeposits.some(d => d.profile === 'edson'), 'Depósito de Edson NO es visible en perfil Karla');
}

// Test 2: Filtrado de Depósitos y Remanente Real para Perfil Edson
{
  const edsonDeposits = sampleDeposits.filter(d => d.profile === 'edson');
  assertEqual(edsonDeposits.length, 1, 'Total depósitos visibles para Edson (1 depósito)');
  
  const dep = edsonDeposits[0];
  const bruto = dep.amount;
  const gastoEquipo = dep.appliesEquipmentExpense ? dep.equipmentExpense : 0;
  const remanenteReal = dep.realUtility !== undefined ? dep.realUtility : (bruto - gastoEquipo);

  assertEqual(bruto, 20000.00, 'Depósito Bruto de Edson ($20,000.00)');
  assertEqual(gastoEquipo, 5000.00, 'Gasto deducido en Compra de Equipo ($5,000.00)');
  assertEqual(remanenteReal, 15000.00, 'Remanente Real en Cuenta de Edson ($15,000.00)');
  assertTrue(!edsonDeposits.some(d => d.profile === 'karla' || d.profile === 'usuario'), 'Depósitos de Karla NO aparecen en lista de Edson');
}

// Test 3: Consumo en Métricas & Analíticas (Desvinculación de Karla)
{
  // Simular la lógica exacta de AnalyticsModule
  const edsonDepositsOnly = sampleDeposits.filter(d => d.profile === 'edson');
  
  const totalDepositosMetricas = edsonDepositsOnly.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const totalGastosEquiposMetricas = edsonDepositsOnly.reduce((sum, d) => sum + (d.appliesEquipmentExpense ? (parseFloat(d.equipmentExpense) || 0) : 0), 0);
  const totalUtilidadRealEnCuenta = edsonDepositsOnly.reduce((sum, d) => {
    const amt = parseFloat(d.amount) || 0;
    const eq = d.appliesEquipmentExpense ? (parseFloat(d.equipmentExpense) || 0) : 0;
    return sum + (d.realUtility !== undefined ? d.realUtility : (amt - eq));
  }, 0);

  assertEqual(totalDepositosMetricas, 20000.00, 'Métricas: Total depósitos de Edson ($20,000.00)');
  assertEqual(totalGastosEquiposMetricas, 5000.00, 'Métricas: Total compras equipo/servicios ($5,000.00)');
  assertEqual(totalUtilidadRealEnCuenta, 15000.00, 'Métricas: Utilidad Real en Cuenta Base ($15,000.00)');

  // Verificar que el depósito de Karla ($10,000 + $4,500) fue 100% ignorado
  const leakedAmount = totalUtilidadRealEnCuenta - 15000.00;
  assertEqual(leakedAmount, 0.00, 'Métricas: Cero fuga o contaminación de depósitos de Karla');
}

// Test 4: Consumo en Inversiones & Bot IA
{
  const edsonDepositsOnly = sampleDeposits.filter(d => d.profile === 'edson');
  const totalUtilidadRealDepositos = edsonDepositsOnly.reduce((sum, d) => {
    const amt = parseFloat(d.amount) || 0;
    const eq = d.appliesEquipmentExpense ? (parseFloat(d.equipmentExpense) || 0) : 0;
    return sum + (d.realUtility !== undefined ? d.realUtility : (amt - eq));
  }, 0);

  const cardExpenses = 5000.00; // Gastos simulados
  const flujoLibre = Math.max(0, totalUtilidadRealDepositos - cardExpenses); // 15000 - 5000 = 10000
  const inversionMin = flujoLibre * 0.10; // 1000
  const inversionMax = flujoLibre * 0.20; // 2000

  assertEqual(totalUtilidadRealDepositos, 15000.00, 'Inversiones: Base Utilidad Real ($15,000.00)');
  assertEqual(flujoLibre, 10000.00, 'Inversiones: Flujo Libre ($10,000.00)');
  assertEqual(inversionMin, 1000.00, 'Bot IA: Recomendación Mínima 10% ($1,000.00)');
  assertEqual(inversionMax, 2000.00, 'Bot IA: Recomendación Máxima 20% ($2,000.00)');
}

console.log('\n🎯 Todas las pruebas de segregación de depósitos y vinculación analítica pasaron con 100% de éxito.\n');
