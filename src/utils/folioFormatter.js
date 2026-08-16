/**
 * Normaliza y formatea cualquier folio al estándar estricto 'FK-XXX' en mayúsculas.
 * Ejemplos:
 *  - '659' -> 'FK-659'
 *  - 'fk659' -> 'FK-659'
 *  - 'fk-659' -> 'FK-659'
 *  - 'FK659' -> 'FK-659'
 *  - 'F-101' -> 'FK-101'
 *  - 'f101' -> 'FK-101'
 *  - 'folio: 102' -> 'FK-102'
 * 
 * @param {string|number} rawFolio
 * @returns {string} Folio estandarizado con prefijo FK- en mayúsculas
 */
export function formatFolio(rawFolio) {
  if (!rawFolio && rawFolio !== 0) return '';
  let str = rawFolio.toString().trim().toUpperCase();
  if (!str) return '';

  // Eliminar prefijos comunes como FOLIO:, FACTURA:, SERIE:
  str = str.replace(/^(?:FOLIO|FACTURA|SERIE)\s*[:#-]?\s*/i, '').trim();

  // Si ya empieza con FK-
  if (str.startsWith('FK-')) {
    const rest = str.substring(3).trim();
    return 'FK-' + rest;
  }

  // Si empieza con FK (ej. FK665 o FK 665 o FK_665)
  if (str.startsWith('FK')) {
    const rest = str.substring(2).replace(/^[-_\s]+/, '').trim();
    return 'FK-' + rest;
  }

  // Si empieza con F- (ej. F-101 o F - 101)
  if (str.startsWith('F-')) {
    const rest = str.substring(2).replace(/^[-_\s]+/, '').trim();
    return 'FK-' + rest;
  }

  // Si empieza con F seguida de dígitos (ej. F101)
  if (/^F\d+/i.test(str)) {
    return 'FK-' + str.substring(1).trim();
  }

  // Para cualquier otro formato (número plano '659', '101', etc.)
  const cleanRest = str.replace(/^[-_\s]+/, '').trim();
  return 'FK-' + cleanRest;
}
