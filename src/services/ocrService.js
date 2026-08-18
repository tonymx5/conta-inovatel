// OCR & PDF/XML Parser Service for Conta Inovatel (Mexican CFDI & Invoice Engine)

import { XMLParser } from 'fast-xml-parser';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Clean and parse Mexican currency/number string
 * (handles $20,326.80, 20326.80, 20.326,80)
 */
function parseCurrency(str) {
  if (!str) return 0;
  let clean = str.replace(/[^0-9.,]/g, '').trim();
  if (!clean) return 0;

  // Handle European vs Latin notation
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf(',') < clean.indexOf('.')) {
      clean = clean.replace(/,/g, ''); // 20,326.80 -> 20326.80
    } else {
      clean = clean.replace(/\./g, '').replace(',', '.'); // 20.326,80 -> 20326.80
    }
  } else if (clean.includes(',')) {
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length === 2) {
      clean = parts[0] + '.' + parts[1];
    } else {
      clean = clean.replace(/,/g, '');
    }
  }

  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

/**
 * Parses raw text extracted from PDF or OCR and matches SAT CFDI patterns
 */
function parseInvoiceText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = text.toUpperCase();

  // 1. Detect Provider Name / Emisor
  let providerName = '';
  if (fullText.includes('SYSCOM') || fullText.includes('SYSTEMAS Y SERVICIOS') || fullText.includes('SYSCOM.MX')) {
    providerName = 'SYSCOM (Computación y Telecomunicaciones)';
  } else if (fullText.includes('OFFICE DEPOT')) {
    providerName = 'OFFICE DEPOT DE MÉXICO';
  } else if (fullText.includes('TELMEX') || fullText.includes('TELÉFONOS DE MÉXICO')) {
    providerName = 'TELMEX';
  } else if (fullText.includes('HOME DEPOT')) {
    providerName = 'THE HOME DEPOT';
  } else if (fullText.includes('STEREN')) {
    providerName = 'STEREN ELECTRÓNICA';
  } else if (fullText.includes('CFE') || fullText.includes('COMISION FEDERAL DE ELECTRICIDAD')) {
    providerName = 'CFE SUMINISTRADOR DE SERVICIOS';
  } else if (fullText.includes('AMAZON')) {
    providerName = 'AMAZON MEXICO';
  } else {
    // Look for lines containing "EMISOR", "RAZÓN SOCIAL", "NOMBRE" or first header line
    const emisorLine = lines.find(l => /^(NOMBRE|RAZON SOCIAL|EMISOR)[\s:]+/i.test(l));
    if (emisorLine) {
      providerName = emisorLine.replace(/^(NOMBRE|RAZON SOCIAL|EMISOR)[\s:]+/i, '').trim();
    } else if (lines.length > 0) {
      providerName = lines[0].substring(0, 40);
    }
  }

  // 2. Detect RFC (Emisor RFC prioritized)
  const allRfcs = text.match(/[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}/gi) || [];
  let rfc = allRfcs[0] ? allRfcs[0].toUpperCase() : 'XAXX010101000';
  
  // If Syscom detected and generic RFC, use Syscom official RFC
  if (providerName.includes('SYSCOM') && (!allRfcs[0] || allRfcs[0].startsWith('XAX'))) {
    rfc = 'STE940428KBA'; // Syscom official RFC
  }

  // 3. Detect Folio / Serie
  let invoiceNo = '';
  const folioMatch = text.match(/(?:FOLIO|SERIE|FACTURA|COMPROBANTE|DOCUMENTO)[\s:#-]+([A-Z0-9/-]+)/i) ||
                     text.match(/FA\d{1,3}\/\d+/i) ||
                     text.match(/F-\d+/i);
  if (folioMatch) {
    invoiceNo = (folioMatch[1] || folioMatch[0]).trim();
  } else {
    invoiceNo = 'PDF-' + Math.floor(1000 + Math.random() * 9000);
  }

  // 4. Detect Date (YYYY-MM-DD or DD/MM/YYYY)
  let date = new Date().toISOString().split('T')[0];
  const dateMatchIso = text.match(/\b(202\d[-/.](?:0[1-9]|1[0-2])[-/.](?:0[1-9]|[12]\d|3[01]))\b/);
  const dateMatchLat = text.match(/\b((?:0[1-9]|[12]\d|3[01])[-/.](?:0[1-9]|1[0-2])[-/.](?:202\d))\b/);
  
  if (dateMatchIso) {
    date = dateMatchIso[1].replace(/[/.]/g, '-');
  } else if (dateMatchLat) {
    const parts = dateMatchLat[1].split(/[-/.]/);
    date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  // 5. Extract Financial Amounts (Subtotal, IVA, Total)
  let subtotal = 0;
  let ivaTotal = 0;
  let total = 0;

  // Regex patterns for amounts
  lines.forEach(line => {
    const upper = line.toUpperCase();
    
    // Subtotal line
    if (/SUB[\s-]?TOTAL|IMPORTE\s+NETO|SUBTOTAL/i.test(upper) && !/IVA|RETENCION/i.test(upper)) {
      const match = line.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/);
      if (match && !subtotal) {
        subtotal = parseCurrency(match[1]);
      }
    }

    // IVA line (8% or 16%)
    if (/IVA|IMPUESTOS?\s+TRASLADAD|IVA\s+16%|IVA\s+8%/i.test(upper) && !/RET/i.test(upper)) {
      const match = line.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/);
      if (match && !ivaTotal) {
        ivaTotal = parseCurrency(match[1]);
      }
    }

    // Total line
    if (/TOTAL|TOTAL\s+A\s+PAGAR|TOTAL\s+MXN|IMPORTE\s+TOTAL/i.test(upper) && !/SUB/i.test(upper)) {
      const match = line.match(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/);
      if (match && !total) {
        total = parseCurrency(match[1]);
      }
    }
  });

  // Fallback / Validation Math Check
  // Case: Subtotal and Total found, compute exact IVA
  if (subtotal > 0 && total > 0 && (!ivaTotal || Math.abs((subtotal + ivaTotal) - total) > 1)) {
    ivaTotal = parseFloat((total - subtotal).toFixed(2));
  } else if (subtotal > 0 && !total) {
    // If no total found, assume 16% standard or 8%
    ivaTotal = ivaTotal || parseFloat((subtotal * 0.16).toFixed(2));
    total = parseFloat((subtotal + ivaTotal).toFixed(2));
  } else if (total > 0 && !subtotal) {
    // If only total found, calculate base with 16%
    subtotal = parseFloat((total / 1.16).toFixed(2));
    ivaTotal = parseFloat((total - subtotal).toFixed(2));
  }

  // Final fallback if no values could be parsed
  if (!subtotal && !total) {
    const allNums = (text.match(/\d+[.,]\d{2}/g) || []).map(parseCurrency).filter(n => n > 50).sort((a, b) => b - a);
    if (allNums.length >= 2) {
      total = allNums[0];
      subtotal = allNums[1];
      ivaTotal = parseFloat((total - subtotal).toFixed(2));
    }
  }

  return {
    success: true,
    providerName: providerName || 'PROVEEDOR DETECTADO',
    rfc: rfc || 'XAXX010101000',
    invoiceNo: invoiceNo || 'DOC-101',
    date,
    subtotal: parseFloat((subtotal || 0).toFixed(2)),
    ivaTotal: parseFloat((ivaTotal || 0).toFixed(2)),
    total: parseFloat((total || 0).toFixed(2)),
    rawText: text
  };
}

export const ocrService = {
  // Process Emitted Invoice XML File (CFDI 4.0 / 3.3 for Conta Inovatel Revenue)
  parseXmlEmittedInvoice: (xmlText) => {
    try {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const jsonObj = parser.parse(xmlText);
      const comprobante = jsonObj['cfdi:Comprobante'] || jsonObj['Comprobante'] || {};
      
      const emisor = comprobante['cfdi:Emisor'] || comprobante['Emisor'] || {};
      const receptor = comprobante['cfdi:Receptor'] || comprobante['Receptor'] || {};
      const impuestos = comprobante['cfdi:Impuestos'] || comprobante['Impuestos'] || {};
      const traslados = impuestos['cfdi:Traslados']?.['cfdi:Traslado'] || impuestos['Traslados']?.['Traslado'] || [];
      const retenciones = impuestos['cfdi:Retenciones']?.['cfdi:Retencion'] || impuestos['Retenciones']?.['Retencion'] || [];
      
      const serie = (comprobante['@_Serie'] || '').trim();
      const folioNum = (comprobante['@_Folio'] || '').trim();
      let folio = '';
      if (serie && folioNum) {
        folio = `${serie}-${folioNum}`;
      } else if (folioNum) {
        folio = folioNum.startsWith('FK') || folioNum.startsWith('F') ? folioNum : `FK-${folioNum}`;
      } else if (serie) {
        folio = serie;
      } else {
        folio = 'FK-XML-' + Math.floor(100 + Math.random() * 900);
      }

      const subtotal = parseFloat(comprobante['@_SubTotal'] || '0');
      const discount = parseFloat(comprobante['@_Descuento'] || '0');
      const total = parseFloat(comprobante['@_Total'] || '0');
      const baseNeta = Math.max(0, subtotal - discount);

      let iva8Total = 0;
      let iva16Total = 0;
      let subtotal8 = 0;
      let subtotal16 = 0;
      let ivaTotal = 0;

      const trasladosList = Array.isArray(traslados) ? traslados : (traslados ? [traslados] : []);
      trasladosList.forEach(t => {
        const imp = t['@_Impuesto'];
        if (imp === '002' || imp === '2') {
          const tasa = parseFloat(t['@_TasaOCuota'] || '0');
          const importe = parseFloat(t['@_Importe'] || '0');
          const base = parseFloat(t['@_Base'] || '0');
          ivaTotal += importe;

          if (Math.abs(tasa - 0.08) < 0.015 || (tasa === 0 && base > 0 && Math.abs((importe / base) - 0.08) < 0.015)) {
            iva8Total += importe;
            subtotal8 += (base || (importe / 0.08));
          } else if (Math.abs(tasa - 0.16) < 0.015 || (tasa === 0 && base > 0 && Math.abs((importe / base) - 0.16) < 0.015)) {
            iva16Total += importe;
            subtotal16 += (base || (importe / 0.16));
          }
        }
      });

      // Si no desglosó por tasa pero hay ivaTotal
      if (ivaTotal === 0 && comprobante['@_Total']) {
        ivaTotal = Math.max(0, total - baseNeta);
      }

      const isMixedTax = iva8Total > 0 && iva16Total > 0;
      let ivaRate = 8;
      if (isMixedTax) {
        ivaRate = 8;
      } else if (iva16Total > 0 || (baseNeta > 0 && (ivaTotal / baseNeta) > 0.12)) {
        ivaRate = 16;
      } else {
        ivaRate = 8;
      }

      // Retenciones (ISR)
      let isrRetained = 0;
      const retencionesList = Array.isArray(retenciones) ? retenciones : (retenciones ? [retenciones] : []);
      retencionesList.forEach(r => {
        const imp = r['@_Impuesto'];
        if (imp === '001' || imp === '1') { // 001 = ISR
          isrRetained += parseFloat(r['@_Importe'] || '0');
        }
      });

      const rfcReceptor = (receptor['@_Rfc'] || '').toUpperCase().trim();
      const isPersonaMoral = rfcReceptor.length === 12;
      const appliesIsr = isrRetained > 0 || isPersonaMoral;
      const isrRate = isrRetained > 0 && baseNeta > 0 ? parseFloat(((isrRetained / baseNeta) * 100).toFixed(2)) : (appliesIsr ? 1.25 : 0);

      // UUID
      const complemento = comprobante['cfdi:Complemento'] || comprobante['Complemento'] || {};
      const tfd = complemento['tfd:TimbreFiscalDigital'] || complemento['TimbreFiscalDigital'] || {};
      const uuid = tfd['@_UUID'] || '';

      return {
        success: true,
        type: 'xml',
        emisorName: emisor['@_Nombre'] || '',
        emisorRfc: emisor['@_Rfc'] || '',
        clientName: receptor['@_Nombre'] || 'CLIENTE SAT',
        rfc: rfcReceptor || 'XAXX010101000',
        folio,
        date: (comprobante['@_Fecha'] || '').split('T')[0] || new Date().toISOString().split('T')[0],
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        baseNeta: parseFloat(baseNeta.toFixed(2)),
        isMixedTax,
        subtotal8: subtotal8 > 0 ? parseFloat(subtotal8.toFixed(2)) : '',
        subtotal16: subtotal16 > 0 ? parseFloat(subtotal16.toFixed(2)) : '',
        ivaRate,
        ivaTotal: parseFloat(ivaTotal.toFixed(2)),
        appliesIsr,
        isrRate: isrRate || 1.25,
        isrRetained: parseFloat(isrRetained.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        uuid
      };
    } catch (e) {
      console.error('XML Emitted Invoice Parse Error:', e);
      return { success: false, error: 'No se pudo leer la estructura del archivo XML CFDI emitido.' };
    }
  },

  // Process XML File (CFDI 4.0 / 3.3) for Provider Deductions
  parseXmlInvoice: (xmlText) => {
    try {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const jsonObj = parser.parse(xmlText);
      const comprobante = jsonObj['cfdi:Comprobante'] || jsonObj['Comprobante'] || {};
      
      const emisor = comprobante['cfdi:Emisor'] || comprobante['Emisor'] || {};
      const impuestos = comprobante['cfdi:Impuestos'] || comprobante['Impuestos'] || {};
      const traslados = impuestos['cfdi:Traslados']?.['cfdi:Traslado'] || impuestos['Traslados']?.['Traslado'] || [];
      
      let ivaTotal = 0;
      if (Array.isArray(traslados)) {
        traslados.forEach(t => {
          if (t['@_Impuesto'] === '002' || t['@_Impuesto'] === '2') {
            ivaTotal += parseFloat(t['@_Importe'] || '0');
          }
        });
      } else if (traslados && (traslados['@_Impuesto'] === '002' || traslados['@_Impuesto'] === '2')) {
        ivaTotal = parseFloat(traslados['@_Importe'] || '0');
      }

      const subtotal = parseFloat(comprobante['@_SubTotal'] || '0');
      const total = parseFloat(comprobante['@_Total'] || '0');

      return {
        success: true,
        type: 'xml',
        providerName: emisor['@_Nombre'] || 'PROVEEDOR SAT',
        rfc: emisor['@_Rfc'] || 'RFC_DESCONOCIDO',
        invoiceNo: comprobante['@_Folio'] || comprobante['@_Serie'] ? `${comprobante['@_Serie'] || ''}-${comprobante['@_Folio'] || ''}` : 'XML-' + Math.floor(1000 + Math.random() * 9000),
        date: (comprobante['@_Fecha'] || '').split('T')[0] || new Date().toISOString().split('T')[0],
        subtotal,
        ivaTotal: ivaTotal || parseFloat((total - subtotal).toFixed(2)),
        total
      };
    } catch (e) {
      console.error('XML Parse Error:', e);
      return { success: false, error: 'No se pudo leer la estructura del archivo XML CFDI.' };
    }
  },

  // Process PDF directly using PDF.js text stream or Tesseract OCR
  scanDocumentOcr: async (file, onProgress) => {
    try {
      // 1. If XML
      if (file.name.endsWith('.xml')) {
        if (onProgress) onProgress('Leyendo estructura XML CFDI 4.0...');
        const text = await file.text();
        return ocrService.parseXmlInvoice(text);
      }

      // 2. If PDF (Extract text stream via PDF.js for 100% digital accuracy)
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        if (onProgress) onProgress('Leyendo contenido digital del PDF...');
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullPdfText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullPdfText += pageText + '\n';
        }

        // If digital text was extracted
        if (fullPdfText.trim().length > 30) {
          if (onProgress) onProgress('Analizando campos fiscales (Subtotal, IVA, RFC, Folio)...');
          const parsed = parseInvoiceText(fullPdfText);
          parsed.type = 'pdf_digital';
          return parsed;
        }
      }

      // 3. If Image / Scanned PDF fallback to Tesseract OCR
      if (onProgress) onProgress('Iniciando reconocimiento óptico de caracteres (OCR)...');
      
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('spa');
      if (onProgress) onProgress('Procesando imagen...');
      
      const ret = await worker.recognize(file);
      await worker.terminate();

      if (onProgress) onProgress('Extrayendo datos de la factura...');
      const parsed = parseInvoiceText(ret.data.text);
      parsed.type = 'ocr_image';
      return parsed;

    } catch (e) {
      console.error('Scan Error:', e);
      return {
        success: true,
        type: 'fallback',
        providerName: 'PROVEEDOR (' + file.name.replace(/\.[^/.]+$/, '') + ')',
        rfc: 'XAXX010101000',
        invoiceNo: 'DOC-' + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toISOString().split('T')[0],
        subtotal: 0,
        ivaTotal: 0,
        total: 0,
        rawText: 'Lectura manual requerida'
      };
    }
  }
};
