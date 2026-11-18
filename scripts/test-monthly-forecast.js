import { formatShortDate } from '../src/utils/dateFormatter.js';
import {
  buildMonthlyProviderAndIncomeSummary,
  computeFutureIncomeForecast
} from '../src/utils/monthlyForecastUtils.js';

function assertEqual(actual, expected, testName) {
  if (typeof expected === 'number') {
    const diff = Math.abs(actual - expected);
    if (diff > 0.009) {
      console.error(`❌ [FALLO] ${testName} -> Esperado: ${expected}, Obtenido: ${actual}`);
      process.exit(1);
    }
  } else if (actual !== expected) {
    console.error(`❌ [FALLO] ${testName} -> Esperado: ${expected}, Obtenido: ${actual}`);
    process.exit(1);
  }
  console.log(`✅ [ÉXITO] ${testName} -> ${actual}`);
}

console.log('🧪 Iniciando Suite de Pruebas: Fecha Corta & Proyección Mensual...\n');

// 1. Pruebas de formatShortDate
assertEqual(formatShortDate('2026-11-13'), '13/nov/2026', 'Formato fecha corta 13/nov/2026');
assertEqual(formatShortDate('2026-01-05T14:30:00'), '05/ene/2026', 'Formato fecha corta ISO enero');
assertEqual(formatShortDate('2026-12-31'), '31/dic/2026', 'Formato fecha corta diciembre');

// 2. Fórmula híbrida con 3 meses cerrados en crecimiento lineal exacto
{
  const refDate = new Date(2026, 10, 17); // 17 Nov 2026
  const series = [
    { key: '2026-08', incomeCollected: 10000 },
    { key: '2026-09', incomeCollected: 20000 },
    { key: '2026-10', incomeCollected: 30000 },
    { key: '2026-11', incomeCollected: 5000 } // Mes en curso: no debe alterar meses cerrados
  ];
  const res = computeFutureIncomeForecast(series, refDate);
  assertEqual(res.closedMonthsCount, 3, 'Cuenta solo los 3 meses cerrados previos a Nov 2026');
  assertEqual(res.movingAvg3M, 20000, 'Promedio móvil 3M = $20,000');
  assertEqual(res.linearProjection, 40000, 'Tendencia lineal al mes 4 = $40,000');
  assertEqual(res.estimatedIncome, 30000, 'Estimación híbrida (50% 3M + 50% lineal) = $30,000');
  assertEqual(res.targetKey, '2026-12', 'Mes objetivo siguiente = 2026-12');
}

// 3. Caso sin historial y caso 1 solo mes
{
  const refDate = new Date(2026, 10, 17);
  const emptyRes = computeFutureIncomeForecast([], refDate);
  assertEqual(emptyRes.estimatedIncome, 0, 'Estimación con 0 meses = $0');

  const oneMonthRes = computeFutureIncomeForecast(
    [{ key: '2026-10', incomeCollected: 15500 }],
    refDate
  );
  assertEqual(oneMonthRes.estimatedIncome, 15500, 'Estimación con 1 mes cerrado = $15,500');
}

// 4. Piso en cero cuando la tendencia lineal cae por debajo de cero
{
  const refDate = new Date(2026, 10, 17);
  const res = computeFutureIncomeForecast(
    [
      { key: '2026-08', incomeCollected: 50000 },
      { key: '2026-09', incomeCollected: 30000 },
      { key: '2026-10', incomeCollected: 5000 }
    ],
    refDate
  );
  assertEqual(res.linearProjection, 0, 'Proyección lineal negativa se acota en $0');
  assertEqual(res.estimatedIncome, 14166.67, 'Estimación híbrida con piso en 0 = 0.5 * 28333.33 + 0');
}

// 5. Integración buildMonthlyProviderAndIncomeSummary con pagos parciales y sin diluir meses vacíos
{
  const refDate = new Date(2026, 10, 17);
  const invoices = [
    {
      id: '1',
      date: '2026-09-10',
      subtotal: 10000,
      ivaTotal: 800,
      appliesIsr: false,
      status: 'PAGADA'
    },
    {
      id: '2',
      date: '2026-10-15',
      subtotal: 20000,
      ivaTotal: 1600,
      appliesIsr: false,
      status: 'PARCIAL',
      hasPartialPayment: true,
      paidAmount: 10000
    },
    {
      id: '3',
      date: '2026-11-13',
      subtotal: 5000,
      ivaTotal: 400,
      appliesIsr: false,
      status: 'PENDIENTE'
    }
  ];
  const deductibles = [
    { id: 'd1', date: '2026-09-12', subtotal: 2000, ivaTotal: 320, total: 2320 },
    { id: 'd2', date: '2026-10-20', subtotal: 4000, ivaTotal: 640, total: 4640 }
  ];

  const summary = buildMonthlyProviderAndIncomeSummary(invoices, deductibles, '2026', refDate);
  assertEqual(summary.monthlyRows.length, 3, 'Solo 3 meses con actividad real (Sep, Oct, Nov)');
  assertEqual(summary.totals.totalIncomeCollected, 20800, 'Total cobrado = $10,800 + $10,000 anticipo = $20,800');
  assertEqual(summary.averages.avgMonthlyIncome, 10400, 'Promedio mensual real sobre 2 meses con cobro = $10,400');
  assertEqual(summary.totals.totalProviderAmount, 6960, 'Total proveedores = $2,320 + $4,640 = $6,960');
  assertEqual(summary.averages.avgMonthlyProvider, 3480, 'Promedio mensual proveedores = $3,480');
}

console.log('\n🎉 Todas las pruebas de fecha corta y proyección mensual pasaron.');
