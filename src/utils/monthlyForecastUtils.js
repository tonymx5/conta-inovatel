import { MONTH_NAMES, SHORT_MONTH_NAMES } from './dateFormatter.js';
import { getInvoiceFinancials } from './invoicePaymentUtils.js';

function round2(num) {
  return parseFloat((Number(num) || 0).toFixed(2));
}

function extractYearMonth(dateStr) {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length < 2) return null;
  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);
  if (!/^\d{4}$/.test(year) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return null;
  }
  const month = String(monthNum).padStart(2, '0');
  return { year, month, monthNum, key: `${year}-${month}` };
}

function formatMonthLabels(year, monthNum) {
  const idx = monthNum - 1;
  const full = `${MONTH_NAMES[idx] || monthNum} ${year}`;
  const short = `${SHORT_MONTH_NAMES[idx] || monthNum}/${year}`;
  return { full, short };
}

function getNextMonthInfo(referenceDate) {
  const d = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
    ? referenceDate
    : new Date();
  const currentYear = d.getFullYear();
  const currentMonthNum = d.getMonth() + 1;
  const currentKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  let nextYear = currentYear;
  let nextMonthNum = currentMonthNum + 1;
  if (nextMonthNum > 12) {
    nextMonthNum = 1;
    nextYear += 1;
  }
  const { full, short } = formatMonthLabels(nextYear, nextMonthNum);
  return {
    currentKey,
    targetKey: `${nextYear}-${String(nextMonthNum).padStart(2, '0')}`,
    targetFullLabel: full,
    targetShortLabel: short
  };
}

/**
 * Calcula la estimación de ingreso del mes futuro combinando:
 * 50% Promedio Móvil de los últimos 3 meses cerrados + 50% Tendencia Lineal (Mínimos Cuadrados).
 *
 * @param {Array<{ key: string, incomeCollected: number }>} sortedIncomeMonths
 * @param {Date} [referenceDate=new Date()]
 */
export function computeFutureIncomeForecast(sortedIncomeMonths, referenceDate = new Date()) {
  const { currentKey, targetKey, targetFullLabel, targetShortLabel } = getNextMonthInfo(referenceDate);

  const validMonths = (sortedIncomeMonths || []).filter(
    (m) => m && m.key && (Number(m.incomeCollected) || 0) > 0
  );

  const closedMonths = validMonths.filter((m) => m.key < currentKey);
  const usedCurrentMonthFallback = closedMonths.length === 0 && validMonths.length > 0;
  const series = closedMonths.length > 0 ? closedMonths : validMonths;

  const n = series.length;
  if (n === 0) {
    return {
      estimatedIncome: 0,
      movingAvg3M: 0,
      linearProjection: 0,
      slope: 0,
      closedMonthsCount: 0,
      usedCurrentMonthFallback: false,
      targetKey,
      targetFullLabel,
      targetShortLabel,
      formulaNote: 'Sin historial de ingresos cobrados suficiente para proyectar.'
    };
  }

  const values = series.map((m) => Number(m.incomeCollected) || 0);
  const k = Math.min(3, n);
  const recentSlice = values.slice(n - k);
  const movingAvg3M = recentSlice.reduce((sum, v) => sum + v, 0) / k;

  let slope = 0;
  let linearProjection = movingAvg3M;

  if (n >= 2) {
    const tMean = (n + 1) / 2;
    const yMean = values.reduce((sum, v) => sum + v, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i + 1;
      const dt = t - tMean;
      num += dt * (values[i] - yMean);
      den += dt * dt;
    }
    slope = den > 0 ? num / den : 0;
    const intercept = yMean - slope * tMean;
    linearProjection = Math.max(0, intercept + slope * (n + 1));
  } else {
    linearProjection = values[0];
  }

  const estimatedIncome = round2(Math.max(0, 0.5 * movingAvg3M + 0.5 * linearProjection));

  const scopeDesc = usedCurrentMonthFallback
    ? '1 mes en curso (sin meses cerrados previos)'
    : `${n} ${n === 1 ? 'mes cerrado' : 'meses cerrados'}`;

  return {
    estimatedIncome,
    movingAvg3M: round2(movingAvg3M),
    linearProjection: round2(linearProjection),
    slope: round2(slope),
    closedMonthsCount: n,
    usedCurrentMonthFallback,
    targetKey,
    targetFullLabel,
    targetShortLabel,
    formulaNote: `50% Promedio últimos ${k}M + 50% Tendencia Lineal (${scopeDesc})`
  };
}

/**
 * Construye la tabla lineal mensual (Ingresos Cobrados vs Facturas Proveedores),
 * totales acumulados, promedios mensuales reales y datos listos para Recharts.
 *
 * @param {Array} invoices
 * @param {Array} deductibles
 * @param {string} [selectedYear='ALL']
 * @param {Date} [referenceDate=new Date()]
 */
export function buildMonthlyProviderAndIncomeSummary(
  invoices = [],
  deductibles = [],
  selectedYear = 'ALL',
  referenceDate = new Date()
) {
  const { currentKey } = getNextMonthInfo(referenceDate);
  const globalMap = new Map();

  const ensureEntry = (ym) => {
    if (!globalMap.has(ym.key)) {
      const { full, short } = formatMonthLabels(ym.year, ym.monthNum);
      globalMap.set(ym.key, {
        key: ym.key,
        year: ym.year,
        month: ym.month,
        monthNum: ym.monthNum,
        fullLabel: full,
        shortLabel: short,
        incomeCollected: 0,
        incomeBilled: 0,
        invoiceCount: 0,
        providerSubtotal: 0,
        providerIva: 0,
        providerTotal: 0,
        deductibleCount: 0,
        netBalance: 0,
        isCurrentMonth: ym.key === currentKey
      });
    }
    return globalMap.get(ym.key);
  };

  (invoices || []).forEach((inv) => {
    const ym = extractYearMonth(inv?.date);
    if (!ym) return;
    const entry = ensureEntry(ym);
    const fin = getInvoiceFinancials(inv);
    entry.incomeCollected = round2(entry.incomeCollected + fin.paidAmount);
    entry.incomeBilled = round2(entry.incomeBilled + fin.total);
    entry.invoiceCount += 1;
  });

  (deductibles || []).forEach((ded) => {
    const ym = extractYearMonth(ded?.date);
    if (!ym) return;
    const entry = ensureEntry(ym);
    entry.providerSubtotal = round2(entry.providerSubtotal + (parseFloat(ded.subtotal) || 0));
    entry.providerIva = round2(entry.providerIva + (parseFloat(ded.ivaTotal) || 0));
    entry.providerTotal = round2(entry.providerTotal + (parseFloat(ded.total) || 0));
    entry.deductibleCount += 1;
  });

  const allMonthsSorted = Array.from(globalMap.values())
    .map((row) => ({
      ...row,
      netBalance: round2(row.incomeCollected - row.providerTotal)
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const monthlyRows = selectedYear && selectedYear !== 'ALL'
    ? allMonthsSorted.filter((r) => r.year === selectedYear)
    : allMonthsSorted;

  const totalIncomeCollected = round2(monthlyRows.reduce((s, r) => s + r.incomeCollected, 0));
  const totalIncomeBilled = round2(monthlyRows.reduce((s, r) => s + r.incomeBilled, 0));
  const totalProviderSubtotal = round2(monthlyRows.reduce((s, r) => s + r.providerSubtotal, 0));
  const totalProviderIva = round2(monthlyRows.reduce((s, r) => s + r.providerIva, 0));
  const totalProviderAmount = round2(monthlyRows.reduce((s, r) => s + r.providerTotal, 0));
  const totalNetBalance = round2(totalIncomeCollected - totalProviderAmount);

  const monthsWithIncome = monthlyRows.filter((r) => r.incomeCollected > 0).length;
  const monthsWithProvider = monthlyRows.filter((r) => r.providerTotal > 0).length;
  const activeMonthsCount = monthlyRows.length;

  const avgMonthlyIncome = monthsWithIncome > 0 ? round2(totalIncomeCollected / monthsWithIncome) : 0;
  const avgMonthlyProvider = monthsWithProvider > 0 ? round2(totalProviderAmount / monthsWithProvider) : 0;
  const avgMonthlyProviderIva = monthsWithProvider > 0 ? round2(totalProviderIva / monthsWithProvider) : 0;
  const avgMonthlyBalance = activeMonthsCount > 0 ? round2(totalNetBalance / activeMonthsCount) : 0;

  const forecast = computeFutureIncomeForecast(allMonthsSorted, referenceDate);

  const chartData = monthlyRows.map((r) => ({
    label: r.shortLabel,
    fullLabel: r.fullLabel,
    Ingresos: r.incomeCollected,
    Proveedores: r.providerTotal,
    IVA_Deducible: r.providerIva,
    Proyeccion: null,
    isForecast: false
  }));

  if (forecast.estimatedIncome > 0) {
    if (chartData.length > 0) {
      const last = chartData[chartData.length - 1];
      last.Proyeccion = last.Ingresos;
    }
    chartData.push({
      label: `${forecast.targetShortLabel} (Est.)`,
      fullLabel: `${forecast.targetFullLabel} (Estimado)`,
      Ingresos: null,
      Proveedores: null,
      IVA_Deducible: null,
      Proyeccion: forecast.estimatedIncome,
      isForecast: true
    });
  }

  return {
    monthlyRows,
    totals: {
      totalIncomeCollected,
      totalIncomeBilled,
      totalProviderSubtotal,
      totalProviderIva,
      totalProviderAmount,
      totalNetBalance
    },
    averages: {
      avgMonthlyIncome,
      avgMonthlyProvider,
      avgMonthlyProviderIva,
      avgMonthlyBalance,
      monthsWithIncome,
      monthsWithProvider,
      activeMonthsCount
    },
    forecast,
    chartData
  };
}
