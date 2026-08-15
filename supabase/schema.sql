-- Supabase / PostgreSQL Schema Migration for Conta Inovatel

-- 1. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rfc TEXT NOT NULL UNIQUE,
    applies_isr BOOLEAN DEFAULT TRUE,
    isr_rate NUMERIC(5,2) DEFAULT 2.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Invoices Table (Facturas Emitidas)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio TEXT NOT NULL,
    client_name TEXT NOT NULL,
    rfc TEXT NOT NULL,
    date DATE NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    iva_total NUMERIC(12,2) NOT NULL,
    applies_isr BOOLEAN DEFAULT TRUE,
    isr_rate NUMERIC(5,2) DEFAULT 2.00,
    isr_retained NUMERIC(12,2) DEFAULT 0.00,
    status TEXT DEFAULT 'PAGADA',
    created_by TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Other Income Table (No Facturados)
CREATE TABLE IF NOT EXISTS public.other_incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    concept TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT DEFAULT 'Efectivo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Deductible Expenses Table (Facturas Proveedores)
CREATE TABLE IF NOT EXISTS public.provider_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    rfc TEXT NOT NULL,
    invoice_no TEXT,
    date DATE NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    iva_total NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    sector TEXT DEFAULT 'Trabajo',
    file_name TEXT,
    file_type TEXT DEFAULT 'pdf',
    scanned_with_ocr BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Bank Accounts Table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name TEXT NOT NULL,
    account_type TEXT NOT NULL, -- 'Débito' / 'Crédito'
    account_number TEXT,
    balance NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Card Expenses Table
CREATE TABLE IF NOT EXISTS public.card_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    bank_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    bank_name TEXT,
    sector TEXT DEFAULT 'Comida',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Investments Table
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_name TEXT NOT NULL,
    category TEXT DEFAULT 'Renta Fija',
    amount_invested NUMERIC(12,2) NOT NULL,
    expected_yield_pct NUMERIC(5,2) DEFAULT 10.00,
    start_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Audit Trail Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT
);

-- 9. Security Incidents Table (Anti-Intruders)
CREATE TABLE IF NOT EXISTS public.security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_agent TEXT,
    client_ip TEXT,
    hostname TEXT,
    approx_location TEXT,
    failed_attempts INT DEFAULT 3,
    tried_passwords JSONB
);
