-- =========================================================================
-- CONTA INOVATEL - ESQUEMA CANÓNICO BLINDADO SUPABASE / POSTGRESQL (v2.8)
-- Estándar: ISO 27001 / OWASP Top 10 / RLS Zero-Trust
-- =========================================================================

-- 1. Facturas de Ingreso (invoices)
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
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 2. Clientes (clients)
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
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 3. Facturas Proveedores / Deducciones (deductibles)
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
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.deductibles ENABLE ROW LEVEL SECURITY;

-- 4. Depósitos a Cuenta / Segregación Edson-Karla (account_deposits)
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
    profile TEXT DEFAULT 'karla',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.account_deposits ENABLE ROW LEVEL SECURITY;

-- 5. Configuración Fiscal (tax_config)
CREATE TABLE IF NOT EXISTS public.tax_config (
    id TEXT PRIMARY KEY,
    isr_estimated_rate NUMERIC(5,2) DEFAULT 1.25,
    last_updated TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tax_config ENABLE ROW LEVEL SECURITY;

-- 6. Bitácora de Auditoría (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    user_role TEXT DEFAULT 'ADMIN',
    ip TEXT
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Gastos por Tarjeta (card_expenses)
CREATE TABLE IF NOT EXISTS public.card_expenses (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    bank_id TEXT,
    bank_name TEXT,
    sector TEXT DEFAULT 'Extras',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.card_expenses ENABLE ROW LEVEL SECURITY;

-- 8. Inversiones y Rendimientos (investments)
CREATE TABLE IF NOT EXISTS public.investments (
    id TEXT PRIMARY KEY,
    asset_name TEXT NOT NULL,
    category TEXT DEFAULT 'CETES / Renta Fija',
    amount_invested NUMERIC(15,2) NOT NULL DEFAULT 0,
    expected_yield_pct NUMERIC(5,2) DEFAULT 0,
    start_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- 9. Otros Gastos (other_expenses)
CREATE TABLE IF NOT EXISTS public.other_expenses (
    id TEXT PRIMARY KEY,
    concept TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    user_role TEXT DEFAULT 'ADMIN',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.other_expenses ENABLE ROW LEVEL SECURITY;

-- 10. Agenda y Eventos (agenda_events)
CREATE TABLE IF NOT EXISTS public.agenda_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    category TEXT DEFAULT 'general',
    color_theme TEXT DEFAULT 'blue',
    completed BOOLEAN DEFAULT FALSE,
    created_by TEXT DEFAULT 'karla',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

-- 11. Auditoría Inmutable (audit_trail_immutable)
CREATE TABLE IF NOT EXISTS public.audit_trail_immutable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT DEFAULT 'system',
    changed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.audit_trail_immutable ENABLE ROW LEVEL SECURITY;

-- ⚠️ NOTA: este archivo solo habilita RLS (sin políticas = acceso denegado a anon). Las políticas y RPC viven en supabase_master_hardening_v2.8.sql (sección 4-5); ejecutarlo SIEMPRE después de este esquema.
