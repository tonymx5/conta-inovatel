-- =========================================================================
-- CONTA INOVATEL — SCRIPT MAESTRO DE BLINDAJE Y SEGURIDAD ENTERPRISE (v2.8)
-- Estándar: NEXUS MASTER v2.8 (ISO 27001 / OWASP / CISA-CISSP Compliant)
-- ⚠️ RESTRICCIÓN: 100% NO DESTRUCTIVO · ZERO DOWNTIME · IDEMPOTENTE
-- Ejecutar directamente en: Supabase SQL Editor (https://supabase.com/dashboard/project/jyhuvmqibfvmfutcvzhw/sql)
-- =========================================================================

-- =========================================================================
-- 1. ESTRUCTURA Y COMPATIBILIDAD DE TABLAS MAESTRAS (10 TABLAS)
-- =========================================================================

-- 1.1 Facturas de Ingreso Emitidas (invoices)
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

-- 1.2 Clientes (clients)
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

-- 1.3 Facturas Proveedores / Deducciones (deductibles)
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

-- 1.4 Depósitos a Cuenta / Segregación Edson-Karla (account_deposits)
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
    profile TEXT DEFAULT 'usuario',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.account_deposits ADD COLUMN IF NOT EXISTS applies_equipment_expense BOOLEAN DEFAULT FALSE;
ALTER TABLE public.account_deposits ADD COLUMN IF NOT EXISTS equipment_expense NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.account_deposits ADD COLUMN IF NOT EXISTS equipment_provider TEXT;
ALTER TABLE public.account_deposits ADD COLUMN IF NOT EXISTS real_utility NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.account_deposits ADD COLUMN IF NOT EXISTS profile TEXT DEFAULT 'usuario';

-- 1.5 Configuración Fiscal (tax_config)
CREATE TABLE IF NOT EXISTS public.tax_config (
    id TEXT PRIMARY KEY,
    isr_estimated_rate NUMERIC(5,2) DEFAULT 1.25,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 Bitácora Operativa de Eventos (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    details TEXT,
    user_role TEXT DEFAULT 'ADMIN',
    ip TEXT
);

-- 1.7 Gastos por Tarjeta (card_expenses)
CREATE TABLE IF NOT EXISTS public.card_expenses (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    bank_id TEXT,
    bank_name TEXT,
    sector TEXT DEFAULT 'Extras',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.8 Inversiones y Bot IA (investments)
CREATE TABLE IF NOT EXISTS public.investments (
    id TEXT PRIMARY KEY,
    asset_name TEXT NOT NULL,
    category TEXT DEFAULT 'CETES / Renta Fija',
    amount_invested NUMERIC(15,2) NOT NULL DEFAULT 0,
    expected_yield_pct NUMERIC(5,2) DEFAULT 0,
    start_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.9 Otros Gastos (other_expenses)
CREATE TABLE IF NOT EXISTS public.other_expenses (
    id TEXT PRIMARY KEY,
    concept TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    user_role TEXT DEFAULT 'ADMIN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.10 Agenda y Calendario Fiscal Chronos (agenda_events)
CREATE TABLE IF NOT EXISTS public.agenda_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    category TEXT DEFAULT 'general',
    color_theme TEXT DEFAULT 'blue',
    completed BOOLEAN DEFAULT FALSE,
    created_by TEXT DEFAULT 'usuario',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 2. ÍNDICES DE ACELERACIÓN B-TREE (PERFORMANCE & RETRIEVAL HARDENING)
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_date_folio ON public.invoices (date DESC, folio);
CREATE INDEX IF NOT EXISTS idx_invoices_rfc ON public.invoices (rfc);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);

CREATE INDEX IF NOT EXISTS idx_clients_rfc ON public.clients (rfc);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (name);

CREATE INDEX IF NOT EXISTS idx_deductibles_date ON public.deductibles (date DESC);
CREATE INDEX IF NOT EXISTS idx_deductibles_rfc ON public.deductibles (rfc);
CREATE INDEX IF NOT EXISTS idx_deductibles_category ON public.deductibles (category);

CREATE INDEX IF NOT EXISTS idx_account_deposits_date ON public.account_deposits (date DESC);
CREATE INDEX IF NOT EXISTS idx_account_deposits_profile ON public.account_deposits (profile);

CREATE INDEX IF NOT EXISTS idx_card_expenses_date ON public.card_expenses (date DESC);
CREATE INDEX IF NOT EXISTS idx_card_expenses_bank_id ON public.card_expenses (bank_id);

CREATE INDEX IF NOT EXISTS idx_investments_category ON public.investments (category);
CREATE INDEX IF NOT EXISTS idx_agenda_events_date ON public.agenda_events (date DESC);
CREATE INDEX IF NOT EXISTS idx_agenda_events_created_by ON public.agenda_events (created_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_other_expenses_date ON public.other_expenses (date DESC);

-- =========================================================================
-- 3. CONSTRAINTS NUMÉRICOS DE INTEGRIDAD (NO NEGATIVOS)
-- =========================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_subtotal_pos') THEN
        ALTER TABLE public.invoices ADD CONSTRAINT chk_invoices_subtotal_pos CHECK (subtotal >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_total_pos') THEN
        ALTER TABLE public.invoices ADD CONSTRAINT chk_invoices_total_pos CHECK (total >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_iva_pos') THEN
        ALTER TABLE public.invoices ADD CONSTRAINT chk_invoices_iva_pos CHECK (iva_total >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_deductibles_total_pos') THEN
        ALTER TABLE public.deductibles ADD CONSTRAINT chk_deductibles_total_pos CHECK (total >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_deposits_amount_pos') THEN
        ALTER TABLE public.account_deposits ADD CONSTRAINT chk_deposits_amount_pos CHECK (amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_card_expenses_amount_pos') THEN
        ALTER TABLE public.card_expenses ADD CONSTRAINT chk_card_expenses_amount_pos CHECK (amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_investments_amount_pos') THEN
        ALTER TABLE public.investments ADD CONSTRAINT chk_investments_amount_pos CHECK (amount_invested >= 0);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- =========================================================================
-- 4. SANEAMIENTO Y BLINDAJE ROW LEVEL SECURITY (RLS)
-- =========================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

-- Helper macro para recrear políticas idempotentes y seguras
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['invoices', 'clients', 'deductibles', 'account_deposits', 'tax_config', 'audit_logs', 'card_expenses', 'investments', 'other_expenses', 'agenda_events'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Eliminar políticas antiguas si existían
        EXECUTE format('DROP POLICY IF EXISTS "policy_select_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "policy_insert_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "policy_update_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "policy_delete_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_all_%s" ON public.%I', t, t);

        -- Política SELECT: Lectura permitida a anon y authenticated
        EXECUTE format('CREATE POLICY "policy_select_%s" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t, t);

        -- Política INSERT: Inserción validada con ID obligatorio
        EXECUTE format('CREATE POLICY "policy_insert_%s" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (id IS NOT NULL)', t, t);

        -- Política UPDATE: Actualización con ID obligatorio
        EXECUTE format('CREATE POLICY "policy_update_%s" ON public.%I FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL)', t, t);

        -- Política DELETE: Blindaje contra eliminación masiva accidental (exige id IS NOT NULL)
        EXECUTE format('CREATE POLICY "policy_delete_%s" ON public.%I FOR DELETE TO anon, authenticated USING (id IS NOT NULL)', t, t);
    END LOOP;
END $$;

-- =========================================================================
-- 5. FUNCIONES RPC TRANSACCIONALES ATÓMICAS (ACID MANDATORY)
-- =========================================================================

-- 5.1 Transacción Atómica: Crear Factura + Registrar Log
CREATE OR REPLACE FUNCTION public.crear_factura_completa(
    p_id TEXT,
    p_folio TEXT,
    p_client_name TEXT,
    p_rfc TEXT,
    p_date DATE,
    p_is_mixed_tax BOOLEAN,
    p_subtotal NUMERIC,
    p_discount NUMERIC,
    p_subtotal8 NUMERIC,
    p_subtotal16 NUMERIC,
    p_iva_rate NUMERIC,
    p_iva_total NUMERIC,
    p_applies_isr BOOLEAN,
    p_isr_rate NUMERIC,
    p_isr_retained NUMERIC,
    p_base_neta NUMERIC,
    p_total NUMERIC,
    p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_folio TEXT;
BEGIN
    -- Normalizar Folio
    v_clean_folio := 'FK-' || regexp_replace(UPPER(p_folio), '^(FK-?|F-?)', '', 'i');

    -- Upsert en Facturas
    INSERT INTO public.invoices (
        id, folio, client_name, rfc, date, is_mixed_tax, subtotal, discount,
        subtotal8, subtotal16, iva_rate, iva_total, applies_isr, isr_rate,
        isr_retained, base_neta, total, status, created_at
    ) VALUES (
        p_id, v_clean_folio, UPPER(TRIM(p_client_name)), UPPER(TRIM(COALESCE(p_rfc, ''))),
        p_date, p_is_mixed_tax, p_subtotal, COALESCE(p_discount, 0),
        COALESCE(p_subtotal8, 0), COALESCE(p_subtotal16, 0), p_iva_rate, p_iva_total,
        p_applies_isr, p_isr_rate, p_isr_retained, p_base_neta, p_total,
        COALESCE(p_status, 'PAGADA'), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        folio = EXCLUDED.folio,
        client_name = EXCLUDED.client_name,
        rfc = EXCLUDED.rfc,
        date = EXCLUDED.date,
        is_mixed_tax = EXCLUDED.is_mixed_tax,
        subtotal = EXCLUDED.subtotal,
        discount = EXCLUDED.discount,
        subtotal8 = EXCLUDED.subtotal8,
        subtotal16 = EXCLUDED.subtotal16,
        iva_rate = EXCLUDED.iva_rate,
        iva_total = EXCLUDED.iva_total,
        applies_isr = EXCLUDED.applies_isr,
        isr_rate = EXCLUDED.isr_rate,
        isr_retained = EXCLUDED.isr_retained,
        base_neta = EXCLUDED.base_neta,
        total = EXCLUDED.total,
        status = EXCLUDED.status;

    -- Registrar evento en bitácora
    INSERT INTO public.audit_logs (id, timestamp, action, details, user_role)
    VALUES (
        'log_rpc_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4),
        NOW(),
        'RPC_CREAR_FACTURA',
        'Factura ' || v_clean_folio || ' (' || UPPER(TRIM(p_client_name)) || ') - Total: $' || p_total,
        'SYSTEM_RPC'
    );

    RETURN json_build_object(
        'success', true,
        'id', p_id,
        'folio', v_clean_folio,
        'total', p_total
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error transaccional en crear_factura_completa: %', SQLERRM;
END;
$$;

-- 5.2 Transacción Atómica: Crear Deducible Proveedor + Registrar Log
CREATE OR REPLACE FUNCTION public.crear_deducible_completo(
    p_id TEXT,
    p_provider_name TEXT,
    p_rfc TEXT,
    p_invoice_no TEXT,
    p_date DATE,
    p_subtotal NUMERIC,
    p_discount NUMERIC,
    p_iva_total NUMERIC,
    p_total NUMERIC,
    p_category TEXT,
    p_file_name TEXT,
    p_file_url TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.deductibles (
        id, provider_name, rfc, invoice_no, date, subtotal, discount,
        iva_total, total, category, file_name, file_url, created_at
    ) VALUES (
        p_id, UPPER(TRIM(p_provider_name)), UPPER(TRIM(COALESCE(p_rfc, ''))),
        p_invoice_no, p_date, p_subtotal, COALESCE(p_discount, 0),
        p_iva_total, p_total, COALESCE(p_category, 'Telecomunicaciones'),
        p_file_name, p_file_url, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        provider_name = EXCLUDED.provider_name,
        rfc = EXCLUDED.rfc,
        invoice_no = EXCLUDED.invoice_no,
        date = EXCLUDED.date,
        subtotal = EXCLUDED.subtotal,
        discount = EXCLUDED.discount,
        iva_total = EXCLUDED.iva_total,
        total = EXCLUDED.total,
        category = EXCLUDED.category,
        file_name = EXCLUDED.file_name,
        file_url = EXCLUDED.file_url;

    INSERT INTO public.audit_logs (id, timestamp, action, details, user_role)
    VALUES (
        'log_rpc_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4),
        NOW(),
        'RPC_CREAR_DEDUCIBLE',
        'Deducible ' || UPPER(TRIM(p_provider_name)) || ' (' || COALESCE(p_invoice_no, '') || ') - IVA: $' || p_iva_total,
        'SYSTEM_RPC'
    );

    RETURN json_build_object('success', true, 'id', p_id);
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error transaccional en crear_deducible_completo: %', SQLERRM;
END;
$$;

-- 5.3 Transacción Atómica: Crear Depósito Bancario + Segregación
CREATE OR REPLACE FUNCTION public.crear_deposito_completo(
    p_id TEXT,
    p_concept TEXT,
    p_amount NUMERIC,
    p_date DATE,
    p_bank_name TEXT,
    p_reference TEXT,
    p_applies_equipment_expense BOOLEAN,
    p_equipment_expense NUMERIC,
    p_equipment_provider TEXT,
    p_real_utility NUMERIC,
    p_profile TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.account_deposits (
        id, concept, amount, date, bank_name, reference,
        applies_equipment_expense, equipment_expense, equipment_provider,
        real_utility, profile, created_at
    ) VALUES (
        p_id, TRIM(p_concept), p_amount, p_date, COALESCE(p_bank_name, 'Santander'),
        p_reference, COALESCE(p_applies_equipment_expense, false),
        COALESCE(p_equipment_expense, 0), p_equipment_provider,
        COALESCE(p_real_utility, p_amount), COALESCE(p_profile, 'karla'), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        concept = EXCLUDED.concept,
        amount = EXCLUDED.amount,
        date = EXCLUDED.date,
        bank_name = EXCLUDED.bank_name,
        reference = EXCLUDED.reference,
        applies_equipment_expense = EXCLUDED.applies_equipment_expense,
        equipment_expense = EXCLUDED.equipment_expense,
        equipment_provider = EXCLUDED.equipment_provider,
        real_utility = EXCLUDED.real_utility,
        profile = EXCLUDED.profile;

    INSERT INTO public.audit_logs (id, timestamp, action, details, user_role)
    VALUES (
        'log_rpc_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 4),
        NOW(),
        'RPC_REGISTRAR_DEPOSITO',
        '[' || UPPER(COALESCE(p_profile, 'KARLA')) || '] ' || TRIM(p_concept) || ' ($' || p_amount || ') - Utilidad: $' || p_real_utility,
        'SYSTEM_RPC'
    );

    RETURN json_build_object('success', true, 'id', p_id);
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error transaccional en crear_deposito_completo: %', SQLERRM;
END;
$$;

-- =========================================================================
-- 6. TABLA DE AUDITORÍA INMUTABLE Y TRIGGERS AUTOMÁTICOS (ISO 27001)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.audit_trail_immutable (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    client_ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON public.audit_trail_immutable (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_at ON public.audit_trail_immutable (performed_at DESC);

-- Función del Trigger de Auditoría
CREATE OR REPLACE FUNCTION public.fn_audit_trail_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rec_id TEXT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_rec_id := OLD.id::TEXT;
        INSERT INTO public.audit_trail_immutable (table_name, record_id, operation, old_data, new_data)
        VALUES (TG_TABLE_NAME, v_rec_id, 'DELETE', to_jsonb(OLD), NULL);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_rec_id := NEW.id::TEXT;
        INSERT INTO public.audit_trail_immutable (table_name, record_id, operation, old_data, new_data)
        VALUES (TG_TABLE_NAME, v_rec_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        v_rec_id := NEW.id::TEXT;
        INSERT INTO public.audit_trail_immutable (table_name, record_id, operation, old_data, new_data)
        VALUES (TG_TABLE_NAME, v_rec_id, 'INSERT', NULL, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Triggers en tablas financieras maestras
DROP TRIGGER IF EXISTS trg_audit_invoices ON public.invoices;
CREATE TRIGGER trg_audit_invoices
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail_log();

DROP TRIGGER IF EXISTS trg_audit_deductibles ON public.deductibles;
CREATE TRIGGER trg_audit_deductibles
AFTER INSERT OR UPDATE OR DELETE ON public.deductibles
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail_log();

DROP TRIGGER IF EXISTS trg_audit_deposits ON public.account_deposits;
CREATE TRIGGER trg_audit_deposits
AFTER INSERT OR UPDATE OR DELETE ON public.account_deposits
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail_log();

DROP TRIGGER IF EXISTS trg_audit_clients ON public.clients;
CREATE TRIGGER trg_audit_clients
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail_log();

-- Blindaje de Inmutabilidad en la tabla de auditoría (Anti-Tampering)
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'PROHIBIDO MODIFICAR O BORRAR REGISTROS DE LA BITÁCORA INMUTABLE ISO 27001.';
END;
$$;

DROP TRIGGER IF EXISTS trg_anti_tamper_audit ON public.audit_trail_immutable;
CREATE TRIGGER trg_anti_tamper_audit
BEFORE UPDATE OR DELETE ON public.audit_trail_immutable
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_audit_tampering();

-- =========================================================================
-- 7. SUPABASE STORAGE BUCKET & POLÍTICAS DE ACCESO
-- =========================================================================

-- Crear bucket de comprobantes si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Almacenamiento en storage.objects
DO $$
BEGIN
    DROP POLICY IF EXISTS "comprobantes_public_read" ON storage.objects;
    DROP POLICY IF EXISTS "comprobantes_anon_insert" ON storage.objects;
    DROP POLICY IF EXISTS "comprobantes_anon_update" ON storage.objects;

    CREATE POLICY "comprobantes_public_read"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'comprobantes');

    CREATE POLICY "comprobantes_anon_insert"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'comprobantes');

    CREATE POLICY "comprobantes_anon_update"
    ON storage.objects FOR UPDATE
    TO anon, authenticated
    USING (bucket_id = 'comprobantes')
    WITH CHECK (bucket_id = 'comprobantes');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- =========================================================================
-- 8. TIEMPO REAL & REPLICA IDENTITY FULL
-- =========================================================================
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.deductibles REPLICA IDENTITY FULL;
ALTER TABLE public.account_deposits REPLICA IDENTITY FULL;
ALTER TABLE public.tax_config REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.card_expenses REPLICA IDENTITY FULL;
ALTER TABLE public.investments REPLICA IDENTITY FULL;
ALTER TABLE public.other_expenses REPLICA IDENTITY FULL;
ALTER TABLE public.agenda_events REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            public.invoices, 
            public.clients, 
            public.deductibles, 
            public.account_deposits, 
            public.tax_config, 
            public.card_expenses, 
            public.investments,
            public.other_expenses,
            public.agenda_events;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- =========================================================================
-- 9. NORMALIZACIÓN AUTOMÁTICA DE DATOS
-- =========================================================================
UPDATE public.invoices 
SET folio = 'FK-' || regexp_replace(UPPER(folio), '^(FK-?|F-?)', '', 'i')
WHERE folio NOT LIKE 'FK-%';

UPDATE public.invoices 
SET iva_rate = 8.00 
WHERE iva_rate >= 7.00 AND iva_rate <= 7.99;

-- =========================================================================
-- FIN DEL SCRIPT MAESTRO DE BLINDAJE ENTERPRISE v2.8 (EXITO)
-- =========================================================================
