-- =========================================================================
-- CONTA INOVATEL - SUPABASE DATABASE SCHEMA & INITIAL DATA
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase
-- =========================================================================

-- 1. TABLA: FACTURAS DE INGRESO (invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    folio TEXT NOT NULL,
    client_name TEXT NOT NULL,
    rfc TEXT,
    date DATE NOT NULL,
    is_mixed_tax BOOLEAN DEFAULT FALSE,
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount NUMERIC(15,2) DEFAULT 0,
    subtotal8 NUMERIC(15,2) DEFAULT 0,
    subtotal16 NUMERIC(15,2) DEFAULT 0,
    iva_rate NUMERIC(5,2) DEFAULT 8.00,
    iva_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    applies_isr BOOLEAN DEFAULT TRUE,
    isr_rate NUMERIC(5,2) DEFAULT 1.25,
    isr_retained NUMERIC(15,2) DEFAULT 0,
    base_neta NUMERIC(15,2) DEFAULT 0,
    total NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'PAGADA',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: CLIENTES (clients)
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rfc TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    sector TEXT,
    notes TEXT,
    applies_isr BOOLEAN DEFAULT TRUE,
    isr_rate NUMERIC(5,2) DEFAULT 1.25,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migración segura si la tabla ya existía previamente
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS applies_isr BOOLEAN DEFAULT TRUE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS isr_rate NUMERIC(5,2) DEFAULT 1.25;

-- 3. TABLA: FACTURAS PROVEEDORES / DEDUCCIONES (deductibles)
CREATE TABLE IF NOT EXISTS public.deductibles (
    id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL,
    rfc TEXT,
    invoice_no TEXT,
    date DATE NOT NULL,
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount NUMERIC(15,2) DEFAULT 0,
    iva_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    total NUMERIC(15,2) NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'Telecomunicaciones',
    file_name TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: DEPÓSITOS A CUENTA / TRANSFERENCIAS (account_deposits)
CREATE TABLE IF NOT EXISTS public.account_deposits (
    id TEXT PRIMARY KEY,
    concept TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    bank_name TEXT DEFAULT 'Santander',
    reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: CONFIGURACIÓN FISCAL (tax_config)
CREATE TABLE IF NOT EXISTS public.tax_config (
    id TEXT PRIMARY KEY,
    isr_estimated_rate NUMERIC(5,2) DEFAULT 1.25,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: BITÁCORA DE AUDITORÍA (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    details TEXT,
    user_role TEXT DEFAULT 'ADMIN',
    ip TEXT
);

-- =========================================================================
-- DESACTIVAR RLS (Permitir lectura y escritura a la API Anon de forma inmediata)
-- =========================================================================
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductibles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- =========================================================================
-- DATOS INICIALES (SEMILLA)
-- =========================================================================

-- Configuración Fiscal por Defecto
INSERT INTO public.tax_config (id, isr_estimated_rate, last_updated)
VALUES ('default', 1.25, NOW())
ON CONFLICT (id) DO NOTHING;

-- Clientes Iniciales
INSERT INTO public.clients (id, name, rfc, email, phone, sector, notes, applies_isr, isr_rate) VALUES
('cli-1', 'JOINT', 'JOI190822ABC', 'contacto@joint.mx', '6641234567', 'Inmobiliario', 'Cliente recurrente', true, 1.25),
('cli-2', 'MAJESTIC', 'MAJ200115DEF', 'admin@majestic.com', '6642345678', 'Industrial', 'Pagos vía SPEI', true, 1.25),
('cli-3', 'GRACIELA', 'GRA850410GHI', 'graciela@gmail.com', '6643456789', 'Comercial', 'Facturación mensual', false, 0.00),
('cli-4', 'ELIZABEHT', 'ELI911005JKL', 'elizabeth@inovatel.mx', '6644567890', 'Servicios', 'Cliente preferencial', false, 0.00),
('cli-5', 'ALCO', 'ALC180312MNO', 'finanzas@alco.mx', '6645678901', 'Manufactura', 'Retención ISR 1.25%', true, 1.25),
('cli-6', 'ALVARADOS', 'ALV980612MNO', 'ventas@alvarados.com', '6645678901', 'Logística', 'Retención ISR 1.25% aplicada', true, 1.25),
('cli-7', 'EDGAR', 'EDG920415XYZ', 'edgar@gmail.com', '6647890123', 'Comercial', 'Sin retención', false, 0.00)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rfc = EXCLUDED.rfc,
  applies_isr = EXCLUDED.applies_isr,
  isr_rate = EXCLUDED.isr_rate;

-- Facturas Iniciales (Julio y Agosto)
INSERT INTO public.invoices (id, folio, client_name, rfc, date, is_mixed_tax, subtotal, discount, subtotal8, subtotal16, iva_rate, iva_total, applies_isr, isr_rate, isr_retained, base_neta, total, status) VALUES
('inv-1', 'F-101', 'JOINT', 'JOI190822ABC', '2026-08-01', false, 7479.41, 0, 0, 0, 7.49, 560.52, true, 1.25, 93.49, 7479.41, 7946.44, 'PAGADA'),
('inv-2', 'F-102', 'MAJESTIC', 'MAJ200115DEF', '2026-08-03', false, 693.87, 0, 0, 0, 7.49, 52.00, true, 1.25, 8.67, 693.87, 737.20, 'PAGADA'),
('inv-3', 'F-103', 'GRACIELA', 'GRA850410GHI', '2026-08-05', false, 842.40, 0, 0, 0, 7.41, 62.40, false, 1.25, 0.00, 842.40, 904.80, 'PAGADA'),
('inv-4', 'F-104', 'ELIZABEHT', 'ELI911005JKL', '2026-08-07', false, 1333.80, 0, 0, 0, 7.41, 98.80, false, 1.25, 0.00, 1333.80, 1432.60, 'PAGADA'),
('inv-5', 'F-105', 'JOINT', 'JOI190822ABC', '2026-08-10', false, 1146.41, 0, 0, 0, 7.49, 85.92, true, 1.25, 14.33, 1146.41, 1218.00, 'PAGADA'),
('inv-6', 'F-106', 'ALVARADOS', 'ALV980612MNO', '2026-08-12', false, 8346.54, 0, 0, 0, 7.49, 625.54, true, 1.25, 104.33, 8346.54, 8867.75, 'PAGADA'),
('inv-7', 'fk665', 'ALVARADOS', 'ALV980612MNO', '2026-08-05', false, 34098.46, 1786.00, 0, 0, 7.60, 2451.26, true, 1.25, 403.91, 32312.46, 34359.81, 'PAGADA'),
('inv-8', 'F-110', 'JOINT', 'JOI190822ABC', '2026-08-10', false, 7376.33, 0, 0, 0, 8.00, 553.10, true, 1.25, 86.37, 7376.33, 7376.33, 'PAGADA')
ON CONFLICT (id) DO NOTHING;

-- Proveedores / Deducciones Iniciales
INSERT INTO public.deductibles (id, provider_name, rfc, invoice_no, date, subtotal, discount, iva_total, total, category) VALUES
('ded-syscom-aug', 'SYSCOM (Computación y Telecomunicaciones)', 'CTE880527J82', 'FA26/1441633', '2026-08-15', 20326.80, 0, 3252.29, 23579.09, 'Equipos & Telecomunicaciones'),
('ded-1', 'Telmex / Infinitum', 'TEL840315-123', 'F-88912', '2026-07-04', 1200.00, 0, 192.00, 1392.00, 'Telecomunicaciones'),
('ded-2', 'CFE Suministrador de Servicios Básicos', 'CFE370814-456', 'CFE-00923', '2026-07-15', 910.00, 0, 145.60, 1055.60, 'Servicios Básicos')
ON CONFLICT (id) DO NOTHING;

-- Depósitos a Cuenta Iniciales
INSERT INTO public.account_deposits (id, concept, amount, date, bank_name, reference) VALUES
('dep-1', 'Transferencia Cobro Factura fk665 (ALVARADOS)', 36224.54, '2026-08-05', 'Santander', 'SPEI-99201')
ON CONFLICT (id) DO NOTHING;
