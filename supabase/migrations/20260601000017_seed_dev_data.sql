-- =============================================================================
-- Migración 17: Seed de datos de desarrollo (OPCIONAL)
-- =============================================================================
-- SOLO SE EJECUTA si la variable de sesión `app.is_dev_seed` está activa
-- (configurable en supabase/config.toml o vía `SET LOCAL app.is_dev_seed = on`).
--
-- En CI/staging/producción esta migración es un no-op.
-- Cómo activarla localmente:
--
--   psql -h localhost -p 54322 -U postgres -d postgres \
--        -c "SET app.is_dev_seed = 'on';" \
--        -f supabase/migrations/20260601000017_seed_dev_data.sql
--
-- Datos:
--   * 3 usuarios fake en auth.users (UUIDs fijos)
--   * 1 trip con 4 miembros
--   * 1 destination poll con 1 propuesta
--   * 1 expense split equally entre los miembros
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Guard: solo ejecutar si app.is_dev_seed = 'on'
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF current_setting('app.is_dev_seed', true) IS DISTINCT FROM 'on' THEN
    RAISE NOTICE 'seed_dev_data: skipped (set app.is_dev_seed=on to enable)';
    RETURN;
  END IF;

  RAISE NOTICE 'seed_dev_data: inserting dev data...';

  -----------------------------------------------------------------------------
  -- 3 usuarios fake en auth.users (passwords dummy, NO USAR EN PRODUCCIÓN)
  -----------------------------------------------------------------------------
  -- Para evitar colisiones con usuarios reales, usamos UUIDs fijos en el
  -- rango 00000000-...-000000000001..003. En dev, el cliente puede usar
  -- "login as dev user" para impersonar.
  -----------------------------------------------------------------------------

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'lucia@plantir.dev',     crypt('dev-password', gen_salt('bf')), now(), '{}'::jsonb, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'marcos@plantir.dev',    crypt('dev-password', gen_salt('bf')), now(), '{}'::jsonb, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sara@plantir.dev',      crypt('dev-password', gen_salt('bf')), now(), '{}'::jsonb, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'carlos@plantir.dev',    crypt('dev-password', gen_salt('bf')), now(), '{}'::jsonb, now(), now(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -----------------------------------------------------------------------------
  -- Perfiles (normalmente los crea el trigger handle_new_user; lo hacemos
  -- explícito por si el trigger no se disparó).
  -----------------------------------------------------------------------------
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES
    ('00000000-0000-0000-0000-000000000001'::uuid, 'Lucia',  NULL),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'Marcos', NULL),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'Sara',   NULL),
    ('00000000-0000-0000-0000-000000000004'::uuid, 'Carlos', NULL)
  ON CONFLICT (id) DO NOTHING;

  -----------------------------------------------------------------------------
  -- 1 trip de ejemplo
  -----------------------------------------------------------------------------
  INSERT INTO public.trips (id, name, description, state, currency, created_by, created_at, updated_at)
  VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Esquiada 2026',
    'Viaje de grupo a Sierra Nevada en puente de diciembre.',
    'planning',
    'EUR',
    '00000000-0000-0000-0000-000000000001'::uuid,  -- lucia
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;

  -- El trigger añade automáticamente a lucia como organizer. Añadimos los
  -- otros 3 como member.
  INSERT INTO public.trip_members (trip_id, user_id, role, display_name, avatar_url)
  VALUES
    ('11111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'member', 'Marcos', NULL),
    ('11111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000003'::uuid, 'member', 'Sara',   NULL),
    ('11111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000004'::uuid, 'member', 'Carlos', NULL)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -----------------------------------------------------------------------------
  -- 1 destination poll con 1 propuesta
  -----------------------------------------------------------------------------
  INSERT INTO public.polls (id, trip_id, kind, status, title, created_by, created_at)
  VALUES (
    '22222222-2222-2222-2222-222222222222'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'destination',
    'open',
    '¿Dónde esquiamos?',
    '00000000-0000-0000-0000-000000000001'::uuid,
    now()
  ) ON CONFLICT (trip_id, kind) DO NOTHING;

  INSERT INTO public.destination_proposals (id, poll_id, trip_id, title, description, external_url, currency, total_price_cents, price_per_person_cents, created_by)
  VALUES (
    '33333333-3333-3333-3333-333333333333'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Sierra Nevada',
    'Estación de esquí en Granada, 3 días forfait + alojamiento.',
    'https://sierranevada.es',
    'EUR',
    120000,  -- 1200 EUR
    30000,   -- 300 EUR/persona
    '00000000-0000-0000-0000-000000000001'::uuid
  ) ON CONFLICT (id) DO NOTHING;

  -----------------------------------------------------------------------------
  -- 1 expense de 100 EUR pagada por Marcos, split igual entre 4
  -----------------------------------------------------------------------------
  -- Necesitamos trip_member_id de Marcos. Como se asigna por gen_random_uuid,
  -- lo resolvemos por SELECT.
  -----------------------------------------------------------------------------
  DECLARE
    v_marcos_tm_id uuid;
    v_expense_id   uuid := '44444444-4444-4444-4444-444444444444';
  BEGIN
    SELECT id INTO v_marcos_tm_id
      FROM public.trip_members
     WHERE trip_id = '11111111-1111-1111-1111-111111111111'::uuid
       AND user_id = '00000000-0000-0000-0000-000000000002'::uuid;

    INSERT INTO public.expenses (
      id, trip_id, title, amount_cents, currency, paid_at,
      paid_by_trip_member_id, category, type, status, strategy,
      created_by_trip_member_id
    )
    VALUES (
      v_expense_id,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Cena de bienvenida',
      10000,           -- 100 EUR
      'EUR',
      current_date,
      v_marcos_tm_id,
      'food',
      'expense',
      'confirmed',
      'equal',
      v_marcos_tm_id
    ) ON CONFLICT (id) DO NOTHING;

    -- 1 split por miembro activo, amount_cents = 2500 (100/4).
    -- (No se incluye al organizer si no quiere; aquí sí.)
    INSERT INTO public.expense_splits (expense_id, trip_member_id, amount_cents, included)
    SELECT
      v_expense_id,
      tm.id,
      2500,
      true
      FROM public.trip_members tm
     WHERE tm.trip_id = '11111111-1111-1111-1111-111111111111'::uuid
       AND tm.status = 'active'
    ON CONFLICT (expense_id, trip_member_id) DO NOTHING;
  END;

  RAISE NOTICE 'seed_dev_data: done. Trip id=11111111-1111-1111-1111-111111111111';
END
$$;
