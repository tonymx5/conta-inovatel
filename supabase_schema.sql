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
    applies_equipment_expense BOOLEAN DEFAULT FALSE,
    equipment_expense NUMERIC(15,2) DEFAULT 0,
    equipment_provider TEXT,
    real_utility NUMERIC(15,2) DEFAULT 0,
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
('inv-1', 'FK-101', 'JOINT', 'JOI190822ABC', '2026-07-01', false, 7006.41, 0, 0, 0, 8.00, 560.52, true, 1.25, 87.52, 7006.41, 7479.41, 'PAGADA'),
('inv-2', 'FK-102', 'MAJESTIC', 'MAJ200115DEF', '2026-07-03', false, 649.87, 0, 0, 0, 8.00, 52.00, true, 1.25, 8.00, 649.87, 693.87, 'PAGADA'),
('inv-3', 'FK-103', 'GRACIELA', 'GRA850410GHI', '2026-07-05', false, 780.00, 0, 0, 0, 8.00, 62.40, false, 0, 0.00, 780.00, 842.40, 'PAGADA'),
('inv-4', 'FK-104', 'ELIZABEHT', 'ELI911005JKL', '2026-07-07', false, 1235.00, 0, 0, 0, 8.00, 98.80, false, 0, 0.00, 1235.00, 1333.80, 'PAGADA'),
('inv-5', 'FK-105', 'ALCO', 'ALC180312MNO', '2026-07-09', false, 1600.00, 0, 0, 0, 8.00, 128.00, true, 1.25, 20.00, 1600.00, 1708.00, 'PAGADA'),
('inv-6', 'FK-106', 'ALVARADOS', 'ALV190930PQR', '2026-07-11', false, 4000.00, 0, 0, 0, 8.00, 320.00, true, 1.25, 50.00, 4000.00, 4270.00, 'PAGADA'),
('inv-7', 'FK-107', 'EDGAR', 'EDG920415XYZ', '2026-07-15', false, 450.00, 0, 0, 0, 8.00, 36.00, false, 0, 0.00, 450.00, 486.00, 'PAGADA'),
('inv-8', 'FK-108', 'ALVARADOS', 'ALV190930PQR', '2026-07-20', false, 4000.00, 0, 0, 0, 8.00, 320.00, true, 1.25, 50.00, 4000.00, 4270.00, 'PAGADA'),
('inv-9', 'FK-665', 'ALVARADOS', 'ALV190930PQR', '2026-08-04', false, 35720.00, 1786.00, 0, 0, 8.00, 2714.72, true, 1.25, 424.18, 33934.00, 36224.54, 'PAGADA'),
('inv-10', 'FK-659', 'JOINT', 'JOI190822ABC', '2026-08-10', false, 6909.60, 0, 0, 0, 8.00, 553.10, true, 1.25, 86.37, 6909.60, 7376.33, 'PAGADA')
ON CONFLICT (id) DO NOTHING;

-- Proveedores / Deducciones Iniciales
INSERT INTO public.deductibles (id, provider_name, rfc, invoice_no, date, subtotal, discount, iva_total, total, category) VALUES
('ded-syscom-aug', 'SYSCOM (Computación y Telecomunicaciones)', 'CTE880527J82', 'FA26/1441633', '2026-08-15', 20326.80, 0, 3252.29, 23579.09, 'Equipos & Telecomunicaciones'),
('ded-1', 'Telmex / Infinitum', 'TEL840315-123', 'F-88912', '2026-07-04', 1200.00, 0, 192.00, 1392.00, 'Telecomunicaciones'),
('ded-2', 'CFE Suministrador de Servicios Básicos', 'CFE370814-456', 'CFE-00923', '2026-07-15', 910.00, 0, 145.60, 1055.60, 'Servicios Básicos')
ON CONFLICT (id) DO NOTHING;

-- Depósitos a Cuenta Iniciales
INSERT INTO public.account_deposits (id, concept, amount, date, bank_name, reference, applies_equipment_expense, equipment_expense, equipment_provider, real_utility) VALUES
('dep-1', 'Transferencia Cobro Factura FK-665 (ALVARADOS)', 36224.54, '2026-08-05', 'Santander', 'SPEI-99201', true, 21952.94, 'SYSCOM (Equipos)', 14271.60)
ON CONFLICT (id) DO NOTHING;
