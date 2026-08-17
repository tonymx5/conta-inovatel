-- =========================================================================
-- CONTA INOVATEL - MIGRACIÓN IDEMPOTENTE PARA PRODUCCIÓN (SUPABASE)
-- Ejecutar en: https://supabase.com/dashboard/project/jyhuvmqibfvmfutcvzhw/sql
-- =========================================================================

-- 1. TABLA: CLIENTES (clients) - Asegurar columnas applies_isr e isr_rate
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

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS applies_isr BOOLEAN DEFAULT TRUE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS isr_rate NUMERIC(5,2) DEFAULT 1.25;

-- 2. TABLA: FACTURAS DE INGRESO (invoices)
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

-- 3. TABLA: DEDUCCIONES PROVEEDORES (deductibles)
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

-- 4. TABLA: DEPÓSITOS A CUENTA (account_deposits)
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

ALTER TABLE public.account_deposits ADD COLUMN IF NOT EXISTS applies_equipment_expense BOOLEAN DEFAULT FALSE;
ALTER TABLE public.account_deposits ADD COLUMN IF NOT EXISTS equipment_expense NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.account_deposits ADD COLUMN IF NOT EXISTS equipment_provider TEXT;
ALTER TABLE public.account_deposits ADD COLUMN IF NOT EXISTS real_utility NUMERIC(15,2) DEFAULT 0;

-- 5. TABLA: CONFIGURACIÓN FISCAL (tax_config)
CREATE TABLE IF NOT EXISTS public.tax_config (
    id TEXT PRIMARY KEY,
    isr_estimated_rate NUMERIC(5,2) DEFAULT 1.25,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: AUDITORÍA (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    details TEXT,
    user_role TEXT DEFAULT 'ADMIN',
    ip TEXT
);

-- Desactivar RLS si se usa llave anon pública directa
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductibles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- 7. NORMALIZACIÓN AUTOMÁTICA DE FOLIOS A FK- Y TASAS DE IVA
UPDATE public.invoices 
SET folio = 'FK-' || regexp_replace(UPPER(folio), '^(FK-?|F-?)', '', 'i')
WHERE folio NOT LIKE 'FK-%';

UPDATE public.invoices 
SET iva_rate = 8.00 
WHERE iva_rate >= 7.00 AND iva_rate <= 7.99;

-- 8. HABILITAR SUPABASE REALTIME MULTIDISPOSITIVO (TIEMPO REAL ENTERPRISE)
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.deductibles REPLICA IDENTITY FULL;
ALTER TABLE public.account_deposits REPLICA IDENTITY FULL;
ALTER TABLE public.tax_config REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices, public.clients, public.deductibles, public.account_deposits, public.tax_config;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;


