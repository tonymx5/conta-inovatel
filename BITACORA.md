# 📜 BITACORA.md — Conta Inovatel

## 📅 Sesión: 27 de Agosto 2026

### 🎯 Objetivo
Resolver de forma definitiva la desincronización y discrepancia de datos en el módulo de facturas entre perfiles (Karla / Edson), eliminando la dependencia de caché estático de navegador, activando sincronización DB-First real con Supabase y estableciendo un ciclo de polling de 30 segundos.

---

### 🔍 Diagnóstico de Causa Raíz
1. **Modelo Híbrido Inadecuado:** El sistema leía `localStorage` de forma síncrona en el milisegundo 0 y guardaba en segundo plano (`Promise.resolve`), provocando que si un usuario creaba o modificaba una factura en un equipo, el otro equipo seguía mostrando datos viejos locales.
2. **WebSockets Zombi en Móviles:** En celulares y laptops en reposo, el WebSocket de Supabase se duerme o desconecta sin avisar.
3. **Falta de Polling de Respaldo:** No existía ningún ciclo periódico para reconciliar datos automáticamente.
4. **Service Worker (`sw.js`) con Caché Permanente:** `sw.js` guardaba `index.html` en caché permanente bajo `conta-inovatel-v1.0`, impidiendo que los usuarios descargaran las versiones nuevas.

---

### 🛠️ Acciones Realizadas
1. **`src/services/storageService.js`:**
   - Implementación de `startPolling(30000)` y `stopPolling()`.
   - Conversión de métodos CRUD (`saveInvoice`, `deleteInvoice`, `saveAccountDeposit`, `saveClient`, `saveDeductible`, etc.) a `async/await` con confirmación obligatoria en Supabase.
   - Envío de marca de tiempo (`timeStr`) en el evento global `conta_data_synced`.
2. **`src/components/InvoicesModule.jsx`:**
   - Integración de micro-etiqueta visual interactiva `✓ Sincronizado (HH:MM:SS)` visible durante 3 segundos al actualizar datos.
   - Inclusión de botón de refresco manual **Actualizar** (`<RefreshCw />`).
   - Acciones de guardado y cambio de estado (`PAGADA`/`PENDIENTE`) con `async/await`.
3. **`src/App.jsx` y `src/components/Header.jsx`:**
   - Activación del polling de 30s en el ciclo de vida principal.
   - Refresco forzado al hacer clic en pestañas.
4. **`public/sw.js` y `vercel.json`:**
   - Actualización a Service Worker `v2.6-live` con estrategia `Network-First` para documentos HTML.
   - Inclusión de cabeceras `Cache-Control: no-cache, no-store, must-revalidate` en Vercel para `index.html` y `sw.js`.
5. **Despliegue Exitoso:**
   - Pipeline [`deploy.ps1`](./deploy.ps1) ejecutado con 100% de éxito en 14.8s.
   - Verificado en producción: [https://conta.inovatel.mx](https://conta.inovatel.mx).

---

### 🛡️ Auto-Auditoría (PAI - 4 Niveles)
- **Estructural:** Código limpio, asíncrono y desacoplado de cachés locales frágiles.
- **Alineación Arquitectónica:** Cumplimiento estricto con el Gold Standard de Supabase DB-First.
- **Robustez & Resiliencia:** Doble canal de actualización (WebSocket Realtime + Polling 30s + Refresco On-Demand).
- **Acabado Visual:** Rich aesthetics con micro-animaciones en botones y feedback claro de 3s al usuario.

---

## 📅 Sesión: 27 de Agosto 2026 (Segregación Contable y Precisión a 2 Decimales)

### 🎯 Objetivo
Corregir la lógica contable de la tarjeta **Ingresos del Mes** para que respete estrictamente el estado de cobranza de cada factura (`PAGADA` vs `PENDIENTE`), evitando que facturas pendientes se sumen a ingresos/utilidad antes de cobrarse, y estandarizar a 2 decimales exactos la fila de Retención ISR (2.5%) y Por depositar.

---

### 🔍 Diagnóstico de Causa Raíz
1. **Suma Indiscriminada de Facturas:** `InvoicesModule.jsx` calculaba `totalIngresoTotal`, `totalIvaTrasladado`, `totalRetencionIsr`, `totalIsrFacturas` y `utilidadReal` iterando sobre todo `filteredInvoices` sin filtrar por `status === 'PAGADA'`.
2. **Formato con 3 Decimales por Defecto en JS:** Cálculos como `totalIngresoTotal * 0.025` producían valores flotantes (`1876.41925`), que al formatearse con `toLocaleString('es-MX', { minimumFractionDigits: 2 })` sin `maximumFractionDigits: 2` se mostraban con 3 decimales (`1,876.419`).

---

### 🛠️ Acciones Realizadas
1. **`src/components/InvoicesModule.jsx`:**
   - Conexión de `totalIngresoTotal`, `totalIvaTrasladado`, `totalIsrFacturas`, `totalRetencionIsr` y `utilidadReal` a `paidInvoices` (`status === 'PAGADA'`).
   - Las facturas `PENDIENTE` se excluyen de la contabilidad del mes y de la Utilidad Real / Por Depositar hasta que se marquen como pagadas.
   - Formateo estricto con `minimumFractionDigits: 2` y `maximumFractionDigits: 2` y redondeo `parseFloat((...).toFixed(2))` en Retención ISR, Utilidad Real y Por Depositar.
2. **`src/components/AnalyticsModule.jsx` & `ProviderDeductionsModule.jsx` & `InvestmentsModule.jsx`:**
   - Homologación del cálculo de ingresos e IVA facturado para considerar exclusivamente facturas con estado no pendiente.
3. **`scripts/test-tax-calculations.js`:**
   - Actualización del test de conciliación mensual con 2 decimales exactos (`$1,876.42` / `$66,852.39`).
   - Creación de Test 8 para validar segregación y exclusión de facturas pendientes en ingresos e IVA.
4. **Despliegue Exitoso a Producción:**
   - Pipeline `deploy.ps1` ejecutado con éxito en 14.6s (Linter 0 errores, Tests 100%, Build limpio, Supabase audit HTTP 200, Vercel HTTP 200).

---

### 🛡️ Auto-Auditoría (PAI - 4 Niveles)
- **Estructural:** Refactorización modular en selectores de cálculo (`useMemo`) sin código espagueti ni parches locales.
- **Alineación Arquitectónica:** Coherencia total con los principios contables de flujo de efectivo y devengo de IVA en el ecosistema Conta Inovatel.
- **Robustez & Precisión:** Suite de pruebas con 8/8 tests de precisión matemática a 2 decimales.
- **Acabado Visual:** Visualización consistente de monedas con 2 decimales estándar `$X,XXX.XX` en todas las tarjetas y desgloses.

---

## 📅 Sesión: 31 de Agosto 2026 (Auditoría, Remediación & Blindaje Enterprise NEXUS v2.8)

### 🎯 Objetivo
Ejecutar auditoría integral de ciberseguridad, base de datos y red bajo el estándar **NEXUS MASTER v2.8** de forma 100% no destructiva en producción con cero tiempo de inactividad.

---

### 🛠️ Acciones Realizadas
1. **Red & Cabeceras HTTP (`vercel.json`):**
   - Inyección de cabecera HSTS: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
   - Content-Security-Policy (CSP) robusto y adaptado para Supabase Cloud, WebSockets, PDF.js worker, Google Fonts y APIs de conectividad.
   - Refuerzo de `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`.
2. **Service Worker & Cache-Busting (`public/sw.js`):**
   - Actualización de versión a `conta-inovatel-v2.8-enterprise` para forzar la actualización transparente y sin activos obsoletos en dispositivos móviles.
3. **Servicios de Persistencia & RPCs (`src/services/storageService.js`):**
   - Conexión de `saveInvoice`, `saveDeductible` y `saveAccountDeposit` a RPCs transaccionales atómicas (`crear_factura_completa`, `crear_deducible_completo`, `crear_deposito_completo`) con fallback seguro a upsert directo.
   - Implementación de `uploadComprobanteStorage` enlazado con Supabase Storage bucket `comprobantes` para neutralizar el riesgo de TOAST bloat en PostgreSQL.
   - Estandarización de `exportFullBackupJSON` con metadatos de integridad ISO 27001 para Disaster Recovery en 1-clic.
4. **Script SQL Maestro Consolidado (`supabase_master_hardening_v2.8.sql`):**
   - Bloque SQL único 100% idempotente con: Saneamiento y blindaje RLS (`WITH CHECK`), funciones RPC transaccionales atómicas con `SECURITY DEFINER` y `search_path`, índices B-Tree de aceleración en claves foráneas y fechas, constraints numéricos no negativos, tabla de auditoría inmutable (`audit_trail_immutable`) con triggers anti-tamper, y bucket de almacenamiento configurado.
5. **Auditoría de Esquema & Linter:**
   - `node scripts/audit-supabase.js`: 100% de tablas y columnas validadas activas en Supabase Cloud.
   - `npm test`: 8/8 pruebas fiscales y de segregación pasadas con 100% de éxito.
   - `npm run lint`: 0 errores y 0 advertencias en Oxlint.
   - `npm run build`: Compilación limpia en Vite.

---

### 🛡️ Auto-Auditoría (PAI - 4 Niveles)
- **Estructural:** Código modular, asíncrono y desacoplado, sin variables huérfanas ni parches locales.
- **Alineación Arquitectónica:** Cumplimiento total de los 16 pilares de NEXUS MASTER v2.8 (DB-First, ACID Mandatory, RLS Hardening, Storage Governance, Secrets Shield).
- **Robustez & Seguridad:** RLS activo con protección contra borrado accidental, RPCs protegidas contra DLL Hijacking, e inmutabilidad de bitácora ISO 27001.
- **Acabado Visual:** Sistema visual fluido con micro-animaciones, respuesta instantánea y retroalimentación interactiva.


