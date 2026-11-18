# 🛡️ Configuración de Agente Local — Conta Inovatel

## ⚙️ Identidad y Alcance
Sistema Web Progresivo (PWA) contable, fiscal y de tesorería de alta precisión para Inovatel Telecomunicaciones.
* **Stack Core**: React + Vite + Tailwind CSS + Supabase PostgreSQL Cloud
* **Producción**: https://conta.inovatel.mx
* **Repositorio**: `origin/main` (Vercel CI/CD)
* **Fuente de Verdad de Datos**: `CONTEXTO.md`

---

## ⚖️ Reglas de Oro Locales (Inquebrantables)

### 1. 👥 Segregación Absoluta de Perfiles (RBAC Fiscal)
- **Perfil Karla (Operador - PIN `2020`)**: Captura operativa diaria. Sus depósitos NO alteran métricas maestras ni utilidad real. Módulos de Agenda fiscal, Facturas de Proveedores e Inversiones permanecen estrictamente invisibles/ocultos.
- **Perfil Edson (Administrador - PIN `0808`)**: Control financiero total. Pregunta interactiva de compras de equipo/servicio. Alimenta gráficos, proyecciones e inversiones.
- Prohibido filtrar datos de Edson hacia la interfaz o respuestas del perfil Karla.

### 2. 🧮 Conciliación Fiscal Intocable
- La fórmula de retención de ISR (1.25%), IVA trasladado (8%/16%) y Utilidad Real está blindada en código.
- Ninguna refactorización o cambio de diseño puede alterar las funciones de cálculo matemático en `src/utils/taxCalculations.js` o equivalentes sin autorización expresa.

### 3. ⚡ DB-First Async/Await & Cuádruple Garantía
- Todas las mutaciones deben esperar confirmación directa de Supabase (`await supabase.from(...)`) antes de actualizar el estado de UI.
- Escucha reactiva en `postgres_changes` con canal unificado y validación local en JS para evitar fallos silenciosos.

### 4. 🚀 Pipeline de Despliegue Obligatorio
- Todo despliegue a producción se realiza estrictamente a través de `deploy.ps1` tras superar `oxlint`, tests locales y `vite build`.

## 📚 Reglas Aprendidas (CALIFICA 2026-11-03)
- **[Auditoría]:** No añadir funciones muertas para satisfacer el escáner (ej. rate limit/consent sin uso); reportar el hallazgo como pendiente.
- **[Sondas]:** verify-supabase-hardening.js es estrictamente de solo lectura por defecto; cualquier prueba de inserción debe requerir `--write-test` y sesión administrativa autenticada para evitar dejar basura en producción.
- **[URLs firmadas]:** No persistir signedUrl con expiración en BD (file_url); guardar storagePath y firmar al consultar.
- **[Supabase Auth Zero-Trust]:** Prohibido guardar contraseñas o PINs literales en el bundle JS; derivar dinámicamente la credencial (`buildAuthPassword`) al ingresar para que `auth.users` valide con bcrypt en el servidor.
- **[RPCs SECURITY DEFINER]:** Al blindar con RLS Zero-Trust, revocar siempre la ejecución anónima (`REVOKE EXECUTE ... FROM PUBLIC, anon`) en funciones `SECURITY DEFINER`, de lo contrario `anon` puede mutar datos saltándose el RLS.
- **[Tokens GoTrue en SQL]:** Al insertar o actualizar usuarios en `auth.users` directamente por SQL, inicializar siempre todas las columnas de tokens de texto a `''` (no `NULL`) e incluir `provider_id = user_id::text` en `auth.identities`.
- **[Rescate de PINs sin SMTP]:** Para evitar dependencia de servidores de correo o cuotas de envío en recuperación de contraseñas, resguardar la Clave Maestra con bcrypt en tabla hermética y exponer el reseteo exclusivamente mediante RPCs con protección anti-fuerza bruta ligada a `pin_auth_lockout`.
- **[Auth Inputs & Catch Granular]:** En modales de autenticación/PIN, incluir toggle de visibilidad (Eye/EyeOff) para transparentar autocompletados erróneos del navegador y tipar los mensajes de error en catch para distinguir rate limits de Supabase Auth vs credenciales inválidas.
- **[Thenables de Supabase sin .catch()]:** Las llamadas a Supabase (`supabase.rpc` y `supabase.from`) retornan instancias de `PostgrestFilterBuilder` (thenables sin método `.catch()` nativo). Invocar siempre con `await` dentro de `try/catch` o envolver en `Promise.resolve(...)` para evitar `TypeError: .catch is not a function`.
- **[Pagos Parciales / Anticipos (CALIFICA 2026-11-17)]:** El estado de cobro de una factura (`PAGADA`/`PARCIAL`/`PENDIENTE`) y sus montos cobrados se obtienen SIEMPRE de `getInvoiceFinancials` (`src/utils/invoicePaymentUtils.js`); prohibido volver a filtrar con `status !== 'PENDIENTE'` en módulos de métricas. Ingresos, IVA e ISR se agregan proporcionalmente a `paidAmount` (autorizado por Edson). Toda columna nueva de `invoices` debe sumarse también a `scripts/audit-supabase.js`.
- **[Simetría en Handlers de Tasas Mixtas]:** En handlers de inputs duales/mixtos (ej. `subtotal8` y `subtotal16`), mantener simetría estricta de variables (`const totalSub = s8 + s16;`) antes de actualizar el estado compuesto para prevenir `ReferenceError: totalSub is not defined` en tiempo de ejecución.
