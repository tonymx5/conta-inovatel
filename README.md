# 📊 CONTA INOVATEL — Sistema Fiscal, Facturación & Finanzas

Sistema web progresivo (PWA) de alta precisión para gestión fiscal, facturación bajo régimen **RESICO**, cálculo de retenciones ISR (1.25%), acreditamiento de IVA (8% / 16%), registro de facturas de proveedores con OCR inteligente y control de depósitos bancarios.

---

## 🌐 Despliegue en Producción
- **Dominio Oficial:** [https://conta.inovatel.mx](https://conta.inovatel.mx)
- **Hosting:** Vercel (Edge Network + SSL HTTPS Global)
- **Base de Datos Cloud:** Supabase (PostgreSQL en tiempo real con sincronización reactiva)
- **Repositorio:** [GitHub - tonymx5/conta-inovatel](https://github.com/tonymx5/conta-inovatel)

---

## 🚀 Características Principales

### 1. 🧾 Facturación Emitida & Cálculo Fiscal RESICO
- **Cálculo Automático:** Desglose exacto de Subtotal, Descuentos, Base Gravable, IVA (8% Fronterizo / 16% Interior), Retención ISR (1.25% Art. 113-J LISR) e Ingreso Total.
- **Diferenciación Fiscal:** Retención de 1.25% obligatoria para Personas Morales y 0% para Personas Físicas / Público en General.
- **Layout Simétrico:** Tabla superior al 100% de ancho con métricas KPI y 3 tarjetas equilibradas en la parte inferior (*Liquidación Fiscal*, *Facturas Proveedores* y *Depósitos a Cuenta*).

### 2. 📑 Facturas Proveedores (`Fact Prov`) & Acreditamiento de IVA
- Registro de facturas deducibles con escáner inteligente OCR para PDF y XML.
- Soporte para **Edición Completa** y eliminación de facturas de proveedores.
- Cálculo en tiempo real de **IVA Trasladado vs IVA Acreditable = IVA Neto Real a Pagar al SAT**.

### 3. 🏦 Depósitos a Cuenta & Control de Bancos
- Registro de transferencias bancarias (Santander, BBVA, etc.) vinculadas con folios y referencias SPEI.
- Conciliación de montos cobrados vs facturados.

### 4. 👥 Catálogo de Clientes
- Gestión completa de clientes con RFC, régimen y tasa de retención personalizada.

### 5. 🛡️ Seguridad & Modo Operador
- **PIN Operador:** `2020` (Acceso de solo lectura / captura segura).
- **PIN Administrador:** `0808` (Desbloqueo total para módulos financieros, edición y auditoría).
- Bitácora de eventos y detección de accesos no autorizados.

---

## 🛠️ Stack Tecnológico
- **Frontend:** React 19 + Vite + Lucide Icons + Vanilla CSS (Rich Aesthetics).
- **Backend / Persistencia:** Supabase Client (`@supabase/supabase-js`) + LocalStorage Dual Sync Cache.
- **OCR / Lectura de Documentos:** Tesseract.js / PDF.js Parser integrado.

---

## 📦 Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:
```env
VITE_SUPABASE_URL=https://jyhuvmqibfvmfutcvzhw.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon_supabase
```

---

## 💻 Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Servidor local de desarrollo
npm run dev

# Compilar para producción (Local check)
npm run build

# Despliegue simultáneo y seguro (Supabase + GitHub + Vercel)
npm run deploy
```

---

## 🚀 Flujo Canónico de Despliegue (`deploy.ps1`)

Para garantizar **cero fallos en actualizaciones** y consistencia absoluta entre servicios:

1. **Pre-flight & Linter:** Validación estática (`oxlint`) y build local (`vite build`).
2. **Supabase DB-First:** Comprobación de salud del endpoint REST y migración SQL idempotente ([`deploy_migration.sql`](file:///d:/Antigravity/Proyectos/Conta%20inovatel/deploy_migration.sql)).
3. **GitHub Sincronización:** Registro de commit semántico atómico y `git push origin main`.
4. **Vercel CI/CD:** Activación automática del build de producción global.
5. **Verificación en Vivo:** Comprobación HTTP 200 en [https://conta.inovatel.mx](https://conta.inovatel.mx).

