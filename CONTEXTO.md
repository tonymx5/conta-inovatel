# 🏛️ CONTEXTO.md — Conta Inovatel (Fuente de Verdad del Proyecto)

## 📌 Resumen General
Sistema Web Progresivo (PWA) de alta precisión contable, fiscal y financiera para la empresa Inovatel.

- **URL de Producción:** https://conta.inovatel.mx
- **Base de Datos Cloud:** Supabase PostgreSQL (`https://jyhuvmqibfvmfutcvzhw.supabase.co`)
- **Repositorio:** https://github.com/tonymx5/conta-inovatel (branch: `main`)

---

## 👥 Arquitectura de Perfiles, Segregación de Datos & Supabase Auth Zero-Trust

- **Gatekeeper Visual:** En la interfaz, los usuarios mantienen su flujo tradicional con PIN simple (Karla: `2020`, Edson: `0808` / `PulguitA`).
- **Autenticación en Servidor (Supabase Auth):** Internamente, el PIN se mapea a identidades de Supabase Auth (`karla@inovatel.mx` y `edson@inovatel.mx`), adquiriendo tokens JWT firmados criptográficamente.
- **Políticas RLS en Base de Datos:**
  - El rol `anon` no tiene acceso directo a ninguna de las 11 tablas.
  - El rol `operator` (Karla) tiene permiso estricto sobre facturas, clientes y depósitos propios (`profile != 'edson'`), con bloqueo a nivel PostgreSQL en deductibles, agenda, inversiones y gastos.
  - El rol `admin` (Edson) tiene privilegios completos.
  - La fuerza bruta está blindada tanto en cliente como en base de datos (`public.pin_auth_lockout` con 5 minutos de enfriamiento).
- **Recuperación y Reseteo Autónomo de PINs:**
  - En caso de olvido de credenciales, el sistema no depende de correos salientes ni de configuraciones SMTP frágiles.
  - **Karla (Operadora):** Edson puede restablecer su PIN a `2020` o asignarle uno nuevo en 1-clic desde `ConfigModal.jsx` (`admin_reset_user_pin`).
  - **Login Gate (Rescate & Visibilidad):** Enlace "¿Olvidaste tu contraseña o PIN?" que valida la **Clave Maestra de Seguridad** en Supabase (`recuperar_pin_con_master_key`) con protección anti-fuerza bruta. Incluye toggle interactivo para ver/ocultar contraseña (`Eye`/`EyeOff`), protección contra autocompletado engañoso de navegadores (`autoComplete="off"`) y manejo granular de errores de autenticación/red.
  - **CLI de Emergencia:** Comando de terminal `npm run reset-pin -- --user <edson|karla> --pin <nuevo_pin>`.

| Perfil | Rol / Permisos | Tarjeta 3 (Depósitos) | Métricas & Inversiones / Agenda |
| :--- | :--- | :--- | :--- |
| **Karla / Operador** | Captura operativa diaria. PIN: `2020` (`karla@inovatel.mx`) | Depósitos estándar brutos (sin compra de equipos). | **Desvinculado 100%**. Sus depósitos no alteran métricas. **Agenda, Fact Prov e Inversiones**: Ocultos/Invisibles en desktop y móvil. Bloqueados por RLS en BD. |
| **Edson / Administrador** | Control financiero total. PIN: `0808` (`edson@inovatel.mx`) | Pregunta interactiva: *"¿Depósito para compra equipo/servicio?"*. Deduce el monto de compra y calcula el **Remanente Real en Cuenta**. | **Vinculado 100%**. Alimenta gráficos y Bot IA. **Agenda, Fact Prov e Inversiones**: Acceso Total. |

## 🧮 Fórmulas y Conciliación Fiscal Clave
- **Ingreso Total Facturas:** $\sum (\text{Base Neta} + \text{IVA Trasladado} - \text{Retención ISR 1.25\%})$
- **ISR Facturas (1.25%):** $\sum \text{Retenciones ISR 1.25\% de facturas emitidas capturadas del período}$.
- **Utilidad Real (edson):** $\text{Ingreso Total} - \text{IVA Trasladado} - \text{Retención ISR (2.5\%)} - \text{ISR Facturas (1.25\%)} - \text{Otros Gastos}$.
- **Por Depositar:** $\text{Utilidad Real (edson)} - \text{Total Depósitos Brutos}$.

---

## 🗄️ Modelo de Datos (11 Tablas en Supabase con Tiempo Real)

1. `invoices` (Facturas Emitidas): Folios normalizados FK-, impuestos 8%/16%, retención ISR 1.25%, descuentos, estatus (`PAGADA`/`PARCIAL`/`PENDIENTE`) y control de anticipos/pagos parciales (`has_partial_payment`, `paid_amount`) con cálculo proporcional en métricas e ingresos.
2. `clients` (Clientes): Catálogo con RFC, contacto y configuración de retención ISR.
3. `deductibles` (Facturas Proveedores / SYSCOM): Deducibles autorizados con desglose de IVA acreditable. Su módulo (`ProviderDeductionsModule.jsx`) incluye tabla/gráfica lineal mensual comparativa contra ingresos cobrados, promedios reales y proyección de ingreso del mes futuro (`monthlyForecastUtils.js`).
4. `account_deposits` (Depósitos Bancarios): Incluye `profile` ('edson'|'karla'), `applies_equipment_expense`, `equipment_expense`, `equipment_provider`, `real_utility`.
5. `tax_config` (Configuración Fiscal): Tasa ISR estimada (1.25%).
6. `audit_logs` (Bitácora de Eventos): Registro de acciones operativas y administrativas.
7. `card_expenses` (Gastos por Tarjeta): Estados de cuenta de tarjetas Banregio / Nu sincronizados en tiempo real.
8. `investments` (Portafolio e Inversiones): Activos, rendimientos anuales y recomendaciones del Bot IA.
9. `other_expenses` (Otros Gastos Operativos): Gastos deducidos del mes sincronizados por rol.
10. `agenda_events` (Agenda y Calendario Chronos): Eventos fiscales, fechas límites del SAT, pagos y compromisos con 4 vistas (Mes, Semana, Día, Agenda).
11. `audit_trail_immutable` (Auditoría Forense Inmutable): Bitácora protegida por triggers anti-tamper (`BEFORE UPDATE OR DELETE`).

---

## ⚡ Sincronización en Tiempo Real & Alta Disponibilidad (Cuádruple Garantía DB-First)
- **DB-First Async/Await:** Todas las operaciones de creación, edición, borrado y cambio de estado se confirman primero con `await` en Supabase Cloud antes de actualizar el estado local.
- **WebSockets Supabase:** `postgres_changes` activo en las tablas maestras con `REPLICA IDENTITY FULL`.
- **Heartbeat Polling Activo (30s):** Temporizador de fondo que consulta silenciosamente Supabase cada 30 segundos para garantizar que cualquier cambio cruzado entre perfiles (Karla/Edson) se refleje en vivo sin necesidad de F5.
- **Refresco On-Demand:** Sincronización forzada al cambiar de módulo, navegar entre pestañas o presionar el botón interactivo "Actualizar".
- **Badge Visual de Sincronización (3s):** Indicador visual interactivo `✓ Sincronizado (HH:MM:SS)` que confirma al usuario el éxito de cada actualización.
- **Blindaje Anti-Caché & Zero-Touch Hot Reload:** Service Worker `v2.10-live` con estrategia `Network-First` para documentos HTML, cabeceras `Cache-Control: no-cache, no-store, must-revalidate` en `vercel.json`, sondeo cada 15 min / `visibilitychange` / `online` y recarga automática en `controllerchange` (solo tras primera instalación, con guardián anti-loop en `sessionStorage`).
- **Foreground / Tab Wakeup:** Listener de `visibilitychange` y `focus` que ejecuta una sincronización silenciosa instantánea al reabrir la app o desbloquear el celular.
- **Disaster Recovery / Snapshots (ISO 22301):** Módulo de respaldo en 1-clic (`BackupModal.jsx`) y script CLI de restauración verificada `bin/restore-db.js` (`npm run db:restore` con soporte `--dry-run` y `--execute`).

---

## 🚀 Pipeline de Despliegue (`deploy.ps1`)
1. Pre-flight: Linter (`oxlint`) + Tests Fiscales y Segregación (`npm test`) + Build (`vite build`).
2. Supabase DB-First Audit: Validación HTTP 200 en las 8 tablas vía `node scripts/audit-supabase.js`.
3. Git Commit & Push a `origin/main`.
4. Vercel CI/CD activación automática.
5. Verificación HTTP 200 en `https://conta.inovatel.mx`.
