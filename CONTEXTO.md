# 🏛️ CONTEXTO.md — Conta Inovatel (Fuente de Verdad del Proyecto)

## 📌 Resumen General
Sistema Web Progresivo (PWA) de alta precisión contable, fiscal y financiera para la empresa Inovatel.

- **URL de Producción:** https://conta.inovatel.mx
- **Base de Datos Cloud:** Supabase PostgreSQL (`https://jyhuvmqibfvmfutcvzhw.supabase.co`)
- **Repositorio:** https://github.com/tonymx5/conta-inovatel (branch: `main`)

---

## 👥 Arquitectura de Perfiles y Segregación de Datos

| Perfil | Rol / Permisos | Tarjeta 3 (Depósitos) | Métricas & Analíticas / Inversiones |
| :--- | :--- | :--- | :--- |
| **Usuario / Operador** | Captura operativa diaria. PIN: `2020` | Depósitos estándar brutos (sin compra de equipos). | **Desvinculado 100%**. Sus depósitos no alteran las métricas ejecutivas. |
| **Edson / Administrador** | Control financiero total. PIN: `0808` | Pregunta interactiva: *"¿Depósito para compra equipo/servicio?"*. Deduce el monto de compra y calcula el **Remanente Real en Cuenta**. | **Vinculado 100%**. Solo los remanentes de Edson alimentan los gráficos y recomendaciones del Bot IA. |

---

## 🗄️ Modelo de Datos (8 Tablas en Supabase con Tiempo Real)

1. `invoices` (Facturas Emitidas): Folios normalizados FK-, impuestos 8%/16%, retención ISR 1.25%, descuentos y estatus.
2. `clients` (Clientes): Catálogo con RFC, contacto y configuración de retención ISR.
3. `deductibles` (Facturas Proveedores / SYSCOM): Deducibles autorizados con desglose de IVA acreditable.
4. `account_deposits` (Depósitos Bancarios): Incluye `profile` ('edson'|'usuario'), `applies_equipment_expense`, `equipment_expense`, `equipment_provider`, `real_utility`.
5. `tax_config` (Configuración Fiscal): Tasa ISR estimada (1.25%).
6. `audit_logs` (Bitácora de Eventos): Registro inmutable de acciones administrativas.
7. `card_expenses` (Gastos por Tarjeta): Estados de cuenta de tarjetas Banregio / Nu sincronizados en tiempo real.
8. `investments` (Portafolio e Inversiones): Activos, rendimientos anuales y recomendaciones del Bot IA.

---

## ⚡ Sincronización en Tiempo Real & Alta Disponibilidad
- **WebSockets Supabase:** `postgres_changes` activo en las 8 tablas con `REPLICA IDENTITY FULL`.
- **Foreground / Tab Wakeup:** Listener de `visibilitychange` y `focus` que ejecuta una sincronización silenciosa instantánea al reabrir la app o desbloquear el celular.
- **Disaster Recovery / Snapshots:** Módulo de respaldo en 1-clic (`BackupModal.jsx`) para exportar e importar archivos JSON completos.
- **Protección Fiscal SAT:** Indicador de Reserva Fiscal antes del día 17 de cada mes.

---

## 🚀 Pipeline de Despliegue (`deploy.ps1`)
1. Pre-flight: Linter (`oxlint`) + Tests Fiscales y Segregación (`npm test`) + Build (`vite build`).
2. Supabase DB-First Audit: Validación HTTP 200 en las 8 tablas vía `node scripts/audit-supabase.js`.
3. Git Commit & Push a `origin/main`.
4. Vercel CI/CD activación automática.
5. Verificación HTTP 200 en `https://conta.inovatel.mx`.
