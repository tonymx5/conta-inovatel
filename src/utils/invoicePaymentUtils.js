// Utilidad pura para normalización financiera, pagos parciales (anticipos)
// y cálculo proporcional de impuestos por factura emitida.

/**
 * Normaliza los totales, el estado real de cobro ('PAGADA' | 'PARCIAL' | 'PENDIENTE')
 * y los montos proporcionales efectivamente cobrados de una factura.
 */
export function getInvoiceFinancials(inv) {
  const subtotal = parseFloat(inv?.subtotal) || 0;
  const discount = parseFloat(inv?.discount) || 0;
  const baseNeta = inv?.baseNeta !== undefined && inv?.baseNeta !== null
    ? (parseFloat(inv.baseNeta) || 0)
    : Math.max(0, subtotal - discount);
  const ivaTotal = parseFloat(inv?.ivaTotal) || 0;
  const appliesIsr = inv?.appliesIsr !== false;
  const isrRetained = appliesIsr
    ? (inv?.isrRetained !== undefined && inv?.isrRetained !== null
        ? (parseFloat(inv.isrRetained) || 0)
        : parseFloat((baseNeta * 0.0125).toFixed(2)))
    : 0;
  const total = parseFloat((baseNeta + ivaTotal - isrRetained).toFixed(2));

  const rawStatus = String(inv?.status || 'PAGADA').toUpperCase().trim();
  const hasPartialFlag = !!(inv?.hasPartialPayment ?? inv?.has_partial_payment);
  const rawPaid = parseFloat(inv?.paidAmount ?? inv?.paid_amount);

  let status = rawStatus;
  let paidAmount = 0;
  let hasPartialPayment = hasPartialFlag;

  if (status === 'PAGADA') {
    paidAmount = total;
  } else if (status === 'PARCIAL' || (status !== 'PENDIENTE' && hasPartialFlag)) {
    const clamped = Number.isFinite(rawPaid) ? Math.min(total, Math.max(0, rawPaid)) : 0;
    paidAmount = parseFloat(clamped.toFixed(2));
    if (total > 0 && paidAmount >= total - 0.009) {
      status = 'PAGADA';
      paidAmount = total;
    } else if (paidAmount <= 0) {
      status = 'PENDIENTE';
      hasPartialPayment = false;
      paidAmount = 0;
    } else {
      status = 'PARCIAL';
      hasPartialPayment = true;
    }
  } else if (status === 'PENDIENTE' && hasPartialFlag && Number.isFinite(rawPaid) && rawPaid > 0) {
    const clamped = Math.min(total, Math.max(0, rawPaid));
    paidAmount = parseFloat(clamped.toFixed(2));
    if (total > 0 && paidAmount >= total - 0.009) {
      status = 'PAGADA';
      paidAmount = total;
    } else {
      status = 'PARCIAL';
      hasPartialPayment = true;
    }
  } else {
    status = 'PENDIENTE';
    hasPartialPayment = false;
    paidAmount = 0;
  }

  const remainingBalance = parseFloat(Math.max(0, total - paidAmount).toFixed(2));
  const collectionRatio = status === 'PAGADA' ? 1 : (total > 0 ? paidAmount / total : 0);

  return {
    subtotal,
    discount,
    baseNeta,
    ivaTotal,
    appliesIsr,
    isrRetained,
    total,
    status,
    hasPartialPayment,
    paidAmount,
    remainingBalance,
    collectionRatio,
    collectedSubtotal: parseFloat((subtotal * collectionRatio).toFixed(2)),
    collectedIva: parseFloat((ivaTotal * collectionRatio).toFixed(2)),
    collectedIsr: parseFloat((isrRetained * collectionRatio).toFixed(2))
  };
}
