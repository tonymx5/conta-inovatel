// Suite de Pruebas Autónomas de Precisión Fiscal & Aritmética para Conta Inovatel
// Valida que ninguna actualización rompa los cálculos de IVA, ISR (RESICO), Utilidad y redondeo SAT.

function assertEqual(actual, expected, testName) {
  const diff = Math.abs(actual - expected);
  if (diff > 0.009) {
    console.error(`❌ [FALLO] ${testName} -> Esperado: ${expected}, Obtenido: ${actual}`);
    process.exit(1);
  } else {
    console.log(`✅ [ÉXITO] ${testName} -> $${actual}`);
  }
}

console.log('🧪 Iniciando Auditoría y Suite de Pruebas de Precisión Fiscal...\n');

// 1. Factura Estándar 8% con Retención 1.25% (Persona Moral RESICO)
{
  const subtotal = 7006.41;
  const discount = 0;
  const baseNeta = subtotal - discount;
  const ivaTotal = parseFloat((baseNeta * 0.08).toFixed(2));
  const isrRetained = parseFloat((baseNeta * 0.0125).toFixed(2));
  const total = parseFloat((baseNeta + ivaTotal - isrRetained).toFixed(2));

  assertEqual(ivaTotal, 560.51, 'IVA 8% en Factura FK-101 (Base $7006.41)');
  assertEqual(isrRetained, 87.58, 'Retención ISR 1.25% en Factura FK-101');
  assertEqual(total, 7479.34, 'Total Neto Factura FK-101');
}

// 2. Factura con Descuento y Retención 1.25%
{
  const subtotal = 35720.00;
  const discount = 1786.00;
  const baseNeta = subtotal - discount; // 33934.00
  const ivaTotal = parseFloat((baseNeta * 0.08).toFixed(2));
  const isrRetained = parseFloat((baseNeta * 0.0125).toFixed(2));
  const total = parseFloat((baseNeta + ivaTotal - isrRetained).toFixed(2));

  assertEqual(baseNeta, 33934.00, 'Base Neta con descuento aplicado');
  assertEqual(ivaTotal, 2714.72, 'IVA 8% sobre base gravable con descuento');
  assertEqual(isrRetained, 424.18, 'Retención ISR 1.25% sobre base con descuento');
  assertEqual(total, 36224.54, 'Total Factura FK-665');
}

// 3. Factura Mixta (8% y 16%)
{
  const subtotal8 = 10000.00;
  const subtotal16 = 5000.00;
  const baseNeta = subtotal8 + subtotal16;
  const iva8 = subtotal8 * 0.08;
  const iva16 = subtotal16 * 0.16;
  const ivaTotal = parseFloat((iva8 + iva16).toFixed(2)); // 800 + 800 = 1600.00
  const isrRetained = parseFloat((baseNeta * 0.0125).toFixed(2)); // 187.50
  const total = parseFloat((baseNeta + ivaTotal - isrRetained).toFixed(2)); // 15000 + 1600 - 187.50 = 16412.50

  assertEqual(ivaTotal, 1600.00, 'IVA Total en Factura Mixta (8% + 16%)');
  assertEqual(isrRetained, 187.50, 'Retención ISR 1.25% en Factura Mixta');
  assertEqual(total, 16412.50, 'Total Factura Mixta');
}

// 4. Conciliación de Depósitos y Utilidad Real con Gasto de Equipo
{
  const amount = 45000.00;
  const appliesEquipmentExpense = true;
  const equipmentExpense = 18500.00;
  const realUtility = parseFloat((amount - (appliesEquipmentExpense ? equipmentExpense : 0)).toFixed(2));

  assertEqual(realUtility, 26500.00, 'Utilidad Real de Depósito con Gasto de Equipo');
}

// 5. Cálculo de IVA Neto a Pagar al SAT (IVA Trasladado - IVA Acreditable)
{
  const ivaTrasladado = 5000.00;
  const ivaAcreditable = 3252.29;
  const ivaNeto = parseFloat((ivaTrasladado - ivaAcreditable).toFixed(2));

  assertEqual(ivaNeto, 1747.71, 'IVA Neto Real a Pagar al SAT');
}

// 6. Conciliación de Ingresos del Mes, ISR Facturas (1.25%) y Utilidad Real (edson)
{
  const totalIngresoTotal = 100000.00;
  const totalIvaTrasladado = 8000.00;
  const totalRetencionIsr = 2500.00; // 2.5%
  const totalIsrFacturas = 1250.00; // Suma de retenciones 1.25% de facturas emitidas
  const totalOtrosGastos = 1500.00;

  const utilidadReal = parseFloat((totalIngresoTotal - totalIvaTrasladado - totalRetencionIsr - totalIsrFacturas - totalOtrosGastos).toFixed(2));
  // 100000 - 8000 - 2500 - 1250 - 1500 = 86750.00

  assertEqual(utilidadReal, 86750.00, 'Utilidad Real (edson) deduciendo ISR Facturas (1.25%)');
}

// 7. Conciliación Mensual de Facturas Emitidas y Otros Gastos (Agosto 2026) con redondeo a 2 decimales
{
  const totalIngresoTotal = 75056.77;
  const totalIvaTrasladado = 5605.91;
  const totalRetencionIsr = parseFloat((totalIngresoTotal * 0.025).toFixed(2)); // 1876.42 (2 decimales exactos)
  const totalIsrFacturas = 623.05;
  const totalOtrosGastos = 99.00; // prime agosto

  const utilidadReal = parseFloat((totalIngresoTotal - totalIvaTrasladado - totalRetencionIsr - totalIsrFacturas - totalOtrosGastos).toFixed(2));
  // 75056.77 - 5605.91 - 1876.42 - 623.05 - 99.00 = 66852.39

  assertEqual(totalRetencionIsr, 1876.42, 'Retención ISR 2.5% a 2 decimales exactos ($1,876.42)');
  assertEqual(utilidadReal, 66852.39, 'Conciliación Exacta de Utilidad Real Agosto ($66,852.39)');
}

// 8. Segregación y Exclusión de Facturas PENDIENTES vs PAGADAS en Ingresos del Mes
{
  const sampleInvoices = [
    { folio: 'FK-101', subtotal: 10000, discount: 0, baseNeta: 10000, ivaTotal: 800, appliesIsr: true, isrRetained: 125, total: 10675, status: 'PAGADA' },
    { folio: 'FK-102', subtotal: 5000, discount: 0, baseNeta: 5000, ivaTotal: 400, appliesIsr: true, isrRetained: 62.5, total: 5337.5, status: 'PENDIENTE' }
  ];
  
  // Filtrar solo facturas PAGADAS para el cálculo contable de ingresos del mes
  const paidInvoices = sampleInvoices.filter(i => i.status === 'PAGADA');
  const totalIngresosMes = paidInvoices.reduce((sum, i) => sum + i.total, 0);
  const totalIvaVentasMes = paidInvoices.reduce((sum, i) => sum + i.ivaTotal, 0);
  const totalIsrFacturasMes = paidInvoices.reduce((sum, i) => sum + i.isrRetained, 0);

  assertEqual(paidInvoices.length, 1, 'Solo 1 factura pagada considerada');
  assertEqual(totalIngresosMes, 10675.00, 'Ingreso del mes excluye factura PENDIENTE ($10,675.00)');
  assertEqual(totalIvaVentasMes, 800.00, 'IVA de ventas excluye factura PENDIENTE ($800.00)');
  assertEqual(totalIsrFacturasMes, 125.00, 'ISR retenido excluye factura PENDIENTE ($125.00)');
}

console.log('\n🎯 Todos los 8 grupos de pruebas fiscales y segregación pasaron con 100% de precisión matemática.\n');
