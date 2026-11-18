// Utility for formatting dates across the entire application: DD/Mes/YYYY (e.g. 08/Enero/2024)

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const SHORT_MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

/**
 * Formats a date string or Date object into "DD/Mes/YYYY" (e.g. "08/Enero/2024")
 * @param {string|Date} dateInput 
 * @param {boolean} includeTime 
 * @returns {string} Formatted date string
 */
export function formatDate(dateInput, includeTime = false) {
  if (!dateInput) return '';

  let day = '';
  let monthName = '';
  let year = '';
  let timeStr = '';

  if (typeof dateInput === 'string') {
    // Check if it's a simple YYYY-MM-DD or ISO string to avoid UTC offset issues
    const cleanDateStr = dateInput.trim();
    if (cleanDateStr.includes('-')) {
      const [datePart, rawTimePart] = cleanDateStr.split('T');
      const parts = datePart.split('-');
      if (parts.length === 3) {
        year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        monthName = MONTH_NAMES[monthIdx] || parts[1];
        day = parts[2].padStart(2, '0');

        if (includeTime && rawTimePart) {
          const timeParts = rawTimePart.split(':');
          if (timeParts.length >= 2) {
            timeStr = ` ${timeParts[0]}:${timeParts[1]}`;
          }
        }

        return `${day}/${monthName}/${year}${timeStr}`;
      }
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  day = String(d.getDate()).padStart(2, '0');
  monthName = MONTH_NAMES[d.getMonth()] || '';
  year = d.getFullYear();

  if (includeTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    timeStr = ` ${hours}:${minutes}`;
  }

  return `${day}/${monthName}/${year}${timeStr}`;
}

/**
 * Formats a date string or Date object into compact "DD/mes/YYYY" (e.g. "13/nov/2026")
 * @param {string|Date} dateInput
 * @returns {string} Compact formatted date string
 */
export function formatShortDate(dateInput) {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const cleanDateStr = dateInput.trim();
    if (cleanDateStr.includes('-')) {
      const [datePart] = cleanDateStr.split('T');
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const shortMonth = SHORT_MONTH_NAMES[monthIdx] || parts[1];
        const day = parts[2].padStart(2, '0');
        return `${day}/${shortMonth}/${year}`;
      }
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, '0');
  const shortMonth = SHORT_MONTH_NAMES[d.getMonth()] || '';
  const year = d.getFullYear();

  return `${day}/${shortMonth}/${year}`;
}
