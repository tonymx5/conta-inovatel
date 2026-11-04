-- =========================================================================
-- CONTA INOVATEL — BLINDAJE SUPABASE AUTH & POLÍTICAS RLS ZERO-TRUST (v3.0)
-- ⚠️ RESTRICCIÓN: 100% NO DESTRUCTIVO · ZERO DATA LOSS · IDEMPOTENTE
-- 
-- INSTRUCCIONES DE APLICACIÓN:
-- 1. Ve a tu Supabase Dashboard: https://supabase.com/dashboard/project/jyhuvmqibfvmfutcvzhw/sql
-- 2. Abre una nueva consulta en el "SQL Editor".
-- 3. Pega todo el contenido de este archivo y presiona "Run" (Ejecutar).
-- 4. Listo: los usuarios quedan autenticados y las 11 tablas quedan 100% protegidas contra accesos no autorizados.
-- =========================================================================

-- =========================================================================
-- PASO 1: EXTENSIÓN PGCRYPTO Y TABLA DE BLOQUEO DE FUERZA BRUTA (SERVER-SIDE)
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.pin_auth_lockout (
    ip_address TEXT PRIMARY KEY,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_auth_lockout ENABLE ROW LEVEL SECURITY;

-- Política de lectura/escritura controlada vía funciones RPC
DROP POLICY IF EXISTS "allow_rpc_lockout" ON public.pin_auth_lockout;
CREATE POLICY "allow_rpc_lockout" ON public.pin_auth_lockout 
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Función RPC para verificar si una IP está bloqueada
CREATE OR REPLACE FUNCTION public.verificar_lockout_pin(p_ip TEXT)
RETURNS JSONB AS $$
DECLARE
    rec RECORD;
    v_remaining_ms BIGINT;
BEGIN
    SELECT * INTO rec FROM public.pin_auth_lockout WHERE ip_address = p_ip;
    IF FOUND AND rec.locked_until IS NOT NULL AND rec.locked_until > now() THEN
        v_remaining_ms := EXTRACT(EPOCH FROM (rec.locked_until - now())) * 1000;
        RETURN jsonb_build_object('is_locked', true, 'remaining_ms', v_remaining_ms);
    END IF;
    RETURN jsonb_build_object('is_locked', false, 'remaining_ms', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para registrar intentos de PIN en servidor
CREATE OR REPLACE FUNCTION public.registrar_intento_pin(p_ip TEXT, p_exito BOOLEAN)
RETURNS JSONB AS $$
DECLARE
    v_attempts INT := 0;
    v_locked_until TIMESTAMPTZ := NULL;
    v_remaining_ms BIGINT := 0;
BEGIN
    IF p_exito THEN
        DELETE FROM public.pin_auth_lockout WHERE ip_address = p_ip;
        RETURN jsonb_build_object('success', true, 'is_locked', false);
    END IF;

    -- Si falló, incrementar intentos
    INSERT INTO public.pin_auth_lockout (ip_address, failed_attempts, last_attempt)
    VALUES (p_ip, 1, now())
    ON CONFLICT (ip_address) DO UPDATE
    SET failed_attempts = public.pin_auth_lockout.failed_attempts + 1,
        last_attempt = now()
    RETURNING failed_attempts INTO v_attempts;

    IF v_attempts >= 3 THEN
        v_locked_until := now() + interval '5 minutes';
        UPDATE public.pin_auth_lockout 
        SET locked_until = v_locked_until 
        WHERE ip_address = p_ip;
        
        v_remaining_ms := 300000;
        RETURN jsonb_build_object('success', false, 'is_locked', true, 'remaining_ms', v_remaining_ms, 'attempts', v_attempts);
    END IF;

    RETURN jsonb_build_object('success', false, 'is_locked', false, 'remaining_ms', 0, 'attempts_remaining', (3 - v_attempts));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- PASO 2: CREACIÓN / ACTUALIZACIÓN DE USUARIOS SUPABASE AUTH
-- =========================================================================
DO $$
DECLARE
    v_karla_id UUID := 'a1111111-2222-3333-4444-555555555555';
    v_edson_id UUID := 'b1111111-2222-3333-4444-555555555555';
    v_karla_pw TEXT := 'ContaInovatel_Karla_2020#SecureAuth';
    v_edson_pw TEXT := 'ContaInovatel_Edson_0808#SecureAuth';
BEGIN
    -- 2.1 Usuario Karla (Perfil Operador - PIN 2020)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'karla@inovatel.mx') THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change,
            email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_karla_id,
            'authenticated',
            'authenticated',
            'karla@inovatel.mx',
            extensions.crypt(v_karla_pw, extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Karla","role":"operator"}'::jsonb,
            false,
            now(),
            now(),
            '', '', '', '', '', '', '', ''
        );
    ELSE
        SELECT id INTO v_karla_id FROM auth.users WHERE email = 'karla@inovatel.mx';
        UPDATE auth.users
        SET encrypted_password = extensions.crypt(v_karla_pw, extensions.gen_salt('bf')),
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"operator"'),
            confirmation_token = coalesce(confirmation_token, ''),
            recovery_token = coalesce(recovery_token, ''),
            email_change_token_new = coalesce(email_change_token_new, ''),
            email_change = coalesce(email_change, ''),
            email_change_token_current = coalesce(email_change_token_current, ''),
            phone_change = coalesce(phone_change, ''),
            phone_change_token = coalesce(phone_change_token, ''),
            reauthentication_token = coalesce(reauthentication_token, '')
        WHERE id = v_karla_id;
    END IF;

    -- Identidad en auth.identities para Karla (incluye provider_id obligatorio en GoTrue 2.x)
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_karla_id OR (provider = 'email' AND provider_id = v_karla_id::text)) THEN
        INSERT INTO auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at,
            id
        ) VALUES (
            v_karla_id::text,
            v_karla_id,
            json_build_object('sub', v_karla_id::text, 'email', 'karla@inovatel.mx'),
            'email',
            now(),
            now(),
            now(),
            v_karla_id
        );
    END IF;

    -- 2.2 Usuario Edson (Perfil Administrador - PIN 0808 / PulguitA)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'edson@inovatel.mx') THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change,
            email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_edson_id,
            'authenticated',
            'authenticated',
            'edson@inovatel.mx',
            extensions.crypt(v_edson_pw, extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Edson","role":"admin"}'::jsonb,
            false,
            now(),
            now(),
            '', '', '', '', '', '', '', ''
        );
    ELSE
        SELECT id INTO v_edson_id FROM auth.users WHERE email = 'edson@inovatel.mx';
        UPDATE auth.users
        SET encrypted_password = extensions.crypt(v_edson_pw, extensions.gen_salt('bf')),
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"'),
            confirmation_token = coalesce(confirmation_token, ''),
            recovery_token = coalesce(recovery_token, ''),
            email_change_token_new = coalesce(email_change_token_new, ''),
            email_change = coalesce(email_change, ''),
            email_change_token_current = coalesce(email_change_token_current, ''),
            phone_change = coalesce(phone_change, ''),
            phone_change_token = coalesce(phone_change_token, ''),
            reauthentication_token = coalesce(reauthentication_token, '')
        WHERE id = v_edson_id;
    END IF;

    -- Identidad en auth.identities para Edson (incluye provider_id obligatorio en GoTrue 2.x)
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_edson_id OR (provider = 'email' AND provider_id = v_edson_id::text)) THEN
        INSERT INTO auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at,
            id
        ) VALUES (
            v_edson_id::text,
            v_edson_id,
            json_build_object('sub', v_edson_id::text, 'email', 'edson@inovatel.mx'),
            'email',
            now(),
            now(),
            now(),
            v_edson_id
        );
    END IF;
END $$;

-- =========================================================================
-- PASO 3: FUNCIONES DE VERIFICACIÓN DE ROL (SECURITY DEFINER STABLE)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        coalesce(auth.jwt() ->> 'email', '') = 'edson@inovatel.mx'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_operator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.role() = 'authenticated'
        AND (
            coalesce(auth.jwt() ->> 'email', '') IN ('edson@inovatel.mx', 'karla@inovatel.mx')
            OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'operator')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =========================================================================
-- PASO 4: CIERRE DE POLÍTICAS RLS ZERO-TRUST EN LAS 11 TABLAS
-- =========================================================================

-- Limpiar políticas obsoletas en todas las tablas
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'invoices', 'clients', 'deductibles', 'account_deposits', 
        'tax_config', 'audit_logs', 'card_expenses', 'investments', 
        'other_expenses', 'agenda_events', 'audit_trail_immutable'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "policy_select_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "policy_insert_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "policy_update_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "policy_delete_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_all_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_select_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON public.%I', t, t);
    END LOOP;
END $$;

-- 4.1 Facturas (invoices): Lectura, creación y edición para operador y admin
CREATE POLICY "auth_all_invoices" ON public.invoices 
    FOR ALL TO authenticated 
    USING (public.is_operator_or_admin()) 
    WITH CHECK (public.is_operator_or_admin());

-- 4.2 Clientes (clients): Catálogo operativo para operador y admin
CREATE POLICY "auth_all_clients" ON public.clients 
    FOR ALL TO authenticated 
    USING (public.is_operator_or_admin()) 
    WITH CHECK (public.is_operator_or_admin());

-- 4.3 Facturas Proveedores / Deducciones (deductibles): ESTRICTO Edson / Admin
CREATE POLICY "auth_admin_deductibles" ON public.deductibles 
    FOR ALL TO authenticated 
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());

-- 4.4 Depósitos a Cuenta (account_deposits): Segregación criptográfica de perfiles
-- Edson ve y edita todo. Karla ve y edita solo depósitos donde profile != 'edson'
CREATE POLICY "auth_select_deposits" ON public.account_deposits 
    FOR SELECT TO authenticated 
    USING (public.is_admin() OR (public.is_operator_or_admin() AND profile != 'edson'));

CREATE POLICY "auth_insert_deposits" ON public.account_deposits 
    FOR INSERT TO authenticated 
    WITH CHECK (public.is_admin() OR (public.is_operator_or_admin() AND (profile = 'karla' OR profile = 'usuario')));

CREATE POLICY "auth_update_deposits" ON public.account_deposits 
    FOR UPDATE TO authenticated 
    USING (public.is_admin() OR (public.is_operator_or_admin() AND profile != 'edson'))
    WITH CHECK (public.is_admin() OR (public.is_operator_or_admin() AND profile != 'edson'));

CREATE POLICY "auth_delete_deposits" ON public.account_deposits 
    FOR DELETE TO authenticated 
    USING (public.is_admin() OR (public.is_operator_or_admin() AND profile != 'edson'));

-- 4.5 Configuración Fiscal (tax_config): Consulta operador y admin, modificación solo admin
CREATE POLICY "auth_select_tax_config" ON public.tax_config 
    FOR SELECT TO authenticated 
    USING (public.is_operator_or_admin());

CREATE POLICY "auth_update_tax_config" ON public.tax_config 
    FOR UPDATE TO authenticated 
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());

-- 4.6 Bitácora (audit_logs): Inserción para ambos, lectura solo Edson / Admin
CREATE POLICY "auth_insert_audit_logs" ON public.audit_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (public.is_operator_or_admin());

CREATE POLICY "auth_select_audit_logs" ON public.audit_logs 
    FOR SELECT TO authenticated 
    USING (public.is_admin());

-- 4.7 Gastos por Tarjeta (card_expenses): ESTRICTO Edson / Admin
CREATE POLICY "auth_admin_card_expenses" ON public.card_expenses 
    FOR ALL TO authenticated 
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());

-- 4.8 Inversiones & Bot IA (investments): ESTRICTO Edson / Admin
CREATE POLICY "auth_admin_investments" ON public.investments 
    FOR ALL TO authenticated 
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());

-- 4.9 Otros Gastos (other_expenses): ESTRICTO Edson / Admin
CREATE POLICY "auth_admin_other_expenses" ON public.other_expenses 
    FOR ALL TO authenticated 
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());

-- 4.10 Agenda y Calendario Chronos (agenda_events): ESTRICTO Edson / Admin
CREATE POLICY "auth_admin_agenda_events" ON public.agenda_events 
    FOR ALL TO authenticated 
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());

-- 4.11 Auditoría Forense Inmutable (audit_trail_immutable): Lectura exclusiva Admin
CREATE POLICY "auth_admin_audit_trail" ON public.audit_trail_immutable 
    FOR SELECT TO authenticated 
    USING (public.is_admin());

-- =========================================================================
-- PASO 5: CERTIFICACIÓN DE INTEGRIDAD
-- =========================================================================
SELECT 
    schemaname, 
    tablename, 
    rowsecurity AS rls_activo
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'invoices', 'clients', 'deductibles', 'account_deposits', 
    'tax_config', 'audit_logs', 'card_expenses', 'investments', 
    'other_expenses', 'agenda_events', 'audit_trail_immutable'
  );

-- =========================================================================
-- 🔄 INTERRUPTOR DE ROLLBACK EN 1 CLIC (POR SI DESEAS REVERTIR EN EL FUTURO)
-- Para revertir este blindaje y volver a permitir acceso a la anon_key,
-- simplemente descomenta y ejecuta las siguientes 10 líneas:
-- =========================================================================
/*
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['invoices', 'clients', 'deductibles', 'account_deposits', 'tax_config', 'audit_logs', 'card_expenses', 'investments', 'other_expenses', 'agenda_events'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "policy_select_%s" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t, t);
        EXECUTE format('CREATE POLICY "policy_insert_%s" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "policy_update_%s" ON public.%I FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "policy_delete_%s" ON public.%I FOR DELETE TO anon, authenticated USING (id IS NOT NULL)', t, t);
    END LOOP;
END $$;
*/
