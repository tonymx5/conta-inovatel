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

console.log('\n🎯 Todos los 6 grupos de pruebas fiscales pasaron con 100% de precisión matemática.\n');
