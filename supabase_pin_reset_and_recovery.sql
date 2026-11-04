-- =========================================================================
-- CONTA INOVATEL — MÓDULO DE RESET Y RECUPERACIÓN DE PIN (v3.1)
-- ⚠️ RESTRICCIÓN: 100% NO DESTRUCTIVO · ZERO DATA LOSS · IDEMPOTENTE
--
-- INSTRUCCIONES DE APLICACIÓN:
-- 1. Ve a tu Supabase Dashboard: https://supabase.com/dashboard/project/jyhuvmqibfvmfutcvzhw/sql
-- 2. Abre una nueva consulta en el "SQL Editor".
-- 3. Pega todo el contenido de este archivo y presiona "Run" (Ejecutar).
-- 4. Listo: El sistema de recuperación queda activo de inmediato.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =========================================================================
-- PASO 1: TABLA PRIVADA DE RECUPERACIÓN MAESTRA
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.system_auth_recovery (
    id TEXT PRIMARY KEY DEFAULT 'master_key',
    recovery_key_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_auth_recovery ENABLE ROW LEVEL SECURITY;

-- Ningún rol (ni anon ni authenticated) puede leer o escribir directamente esta tabla
REVOKE ALL ON public.system_auth_recovery FROM PUBLIC, anon, authenticated;

-- Clave Maestra de Seguridad por Defecto: 'InovatelMaster2026!#'
INSERT INTO public.system_auth_recovery (id, recovery_key_hash, updated_at)
VALUES ('master_key', extensions.crypt('InovatelMaster2026!#', extensions.gen_salt('bf')), now())
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- PASO 2: RPC PARA RESET DE PIN POR ADMINISTRADOR (DESDE PANEL DE EDSON)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_user_pin(p_target_email TEXT, p_new_pin TEXT)
RETURNS JSONB AS $$
DECLARE
    v_label TEXT;
    v_auth_pw TEXT;
    v_user_id UUID;
    v_clean_pin TEXT := trim(coalesce(p_new_pin, ''));
BEGIN
    -- 1. Validar que el ejecutor sea admin
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Acceso denegado: Solo el perfil Administrador puede restablecer PINs.');
    END IF;

    -- 2. Validar formato de PIN
    IF length(v_clean_pin) < 4 THEN
        RETURN jsonb_build_object('success', false, 'message', 'El nuevo PIN debe contener al menos 4 caracteres.');
    END IF;

    -- 3. Mapear email a label
    IF lower(trim(p_target_email)) = 'karla@inovatel.mx' THEN
        v_label := 'Karla';
    ELSIF lower(trim(p_target_email)) = 'edson@inovatel.mx' THEN
        v_label := 'Edson';
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Usuario no registrado en el sistema.');
    END IF;

    -- 4. Obtener usuario en auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_target_email));
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No se localizó el usuario en la base de datos de autenticación.');
    END IF;

    v_auth_pw := 'ContaInovatel_' || v_label || '_' || v_clean_pin || '#SecureAuth';

    -- 5. Actualizar en auth.users
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(v_auth_pw, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = v_user_id;

    -- 6. Registrar en bitácora de auditoría
    INSERT INTO public.audit_logs (profile, action, details, timestamp)
    VALUES ('ADMIN', 'RESET_PIN_ADMIN', 'PIN de ' || v_label || ' actualizado por Administrador.', now());

    RETURN jsonb_build_object('success', true, 'message', 'PIN de ' || v_label || ' actualizado exitosamente.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.admin_reset_user_pin(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_pin(TEXT, TEXT) TO authenticated;

-- =========================================================================
-- PASO 3: RPC PARA RECUPERACIÓN CON CLAVE MAESTRA (DESDE LOGIN GATE)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.recuperar_pin_con_master_key(
    p_ip TEXT, 
    p_target_user TEXT, 
    p_master_key TEXT, 
    p_new_pin TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_lock JSONB;
    v_stored_hash TEXT;
    v_email TEXT;
    v_label TEXT;
    v_auth_pw TEXT;
    v_user_id UUID;
    v_clean_pin TEXT := trim(coalesce(p_new_pin, ''));
    v_clean_master TEXT := trim(coalesce(p_master_key, ''));
BEGIN
    -- 1. Verificar bloqueo por fuerza bruta en la IP
    v_lock := public.verificar_lockout_pin(p_ip);
    IF (v_lock->>'is_locked')::boolean THEN
        RETURN jsonb_build_object(
            'success', false, 
            'is_locked', true, 
            'remaining_ms', (v_lock->>'remaining_ms')::bigint,
            'message', 'Sistema bloqueado temporalmente por múltiples intentos fallidos.'
        );
    END IF;

    -- 2. Validar usuario objetivo
    IF lower(trim(p_target_user)) IN ('karla', 'operador', 'karla@inovatel.mx') THEN
        v_email := 'karla@inovatel.mx';
        v_label := 'Karla';
    ELSIF lower(trim(p_target_user)) IN ('edson', 'admin', 'edson@inovatel.mx') THEN
        v_email := 'edson@inovatel.mx';
        v_label := 'Edson';
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Usuario no reconocido. Selecciona Karla o Edson.');
    END IF;

    -- 3. Validar nuevo PIN
    IF length(v_clean_pin) < 4 THEN
        RETURN jsonb_build_object('success', false, 'message', 'El nuevo PIN debe tener al menos 4 caracteres.');
    END IF;

    -- 4. Obtener y validar Clave Maestra
    SELECT recovery_key_hash INTO v_stored_hash 
    FROM public.system_auth_recovery 
    WHERE id = 'master_key';

    IF v_stored_hash IS NULL OR extensions.crypt(v_clean_master, v_stored_hash) != v_stored_hash THEN
        -- Registrar intento fallido en pin_auth_lockout
        PERFORM public.registrar_intento_pin(p_ip, false);
        RETURN jsonb_build_object('success', false, 'message', 'Clave Maestra de Seguridad incorrecta.');
    END IF;

    -- 5. Clave Maestra Válida: Localizar usuario en auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuario no localizado en la base de datos.');
    END IF;

    v_auth_pw := 'ContaInovatel_' || v_label || '_' || v_clean_pin || '#SecureAuth';

    -- 6. Actualizar contraseña cifrada con bcrypt en auth.users
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(v_auth_pw, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = v_user_id;

    -- 7. Limpiar bloqueo de intentos para la IP tras rescate exitoso
    PERFORM public.registrar_intento_pin(p_ip, true);

    -- 8. Registrar en auditoría
    INSERT INTO public.audit_logs (profile, action, details, timestamp)
    VALUES ('SISTEMA', 'RESCATE_PIN_MASTER_KEY', 'PIN de ' || v_label || ' restablecido exitosamente con Clave Maestra de Emergencia.', now());

    RETURN jsonb_build_object(
        'success', true, 
        'message', '¡PIN de ' || v_label || ' restablecido con éxito! Ya puedes iniciar sesión con tu nueva clave.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.recuperar_pin_con_master_key(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- =========================================================================
-- PASO 4: RPC PARA QUE EDSON CAMBIE LA CLAVE MAESTRA
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_update_master_recovery_key(p_new_master_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_clean_master TEXT := trim(coalesce(p_new_master_key, ''));
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solo el Administrador puede actualizar la Clave Maestra.');
    END IF;

    IF length(v_clean_master) < 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'La Clave Maestra debe tener al menos 8 caracteres.');
    END IF;

    UPDATE public.system_auth_recovery
    SET recovery_key_hash = extensions.crypt(v_clean_master, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = 'master_key';

    INSERT INTO public.audit_logs (profile, action, details, timestamp)
    VALUES ('ADMIN', 'UPDATE_MASTER_KEY', 'Clave Maestra de Recuperación actualizada por Administrador.', now());

    RETURN jsonb_build_object('success', true, 'message', 'Clave Maestra de Seguridad actualizada exitosamente.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.admin_update_master_recovery_key(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_master_recovery_key(TEXT) TO authenticated;
