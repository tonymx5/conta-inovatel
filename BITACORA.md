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
