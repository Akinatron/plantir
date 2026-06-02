-- =============================================================================
-- rls-smoke.test.sql — Smoke test de RLS y constraints
-- =============================================================================
-- Pruebas adversariales: cada test intenta una operación que DEBE fallar (o
-- devolver 0 filas) y verifica que el comportamiento es el esperado. Si
-- alguna assertion falla, el script aborta con RAISE EXCEPTION.
--
-- EJECUCIÓN:
--   psql -h localhost -p 54322 -U postgres -d postgres \
--        -v ON_ERROR_STOP=1 \
--        -f supabase/tests/rls-smoke.test.sql
--
-- PRERREQUISITO: el seed de dev (20260601000017) debe estar aplicado, O las
-- 4 fixtures que se crean aquí (TEST 0) deben existir. El script es
-- self-contained: si no detecta las fixtures del seed, las crea él mismo
-- usando service_role.
-- =============================================================================

\set ON_ERROR_STOP on

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
-- Para simular usuarios autenticados, hacemos `SET LOCAL role` y `SET LOCAL
-- request.jwt.claims` antes de cada operación. El rol `authenticated` se
-- usa en las policies.
-- -----------------------------------------------------------------------------

-- Habilita log de NOTICE para ver el progreso
\set ECHO none
\pset pager off

-- Track de assertions: si alguna falla, abortamos al final
CREATE TEMP TABLE IF NOT EXISTS _test_results (
  test_id    text PRIMARY KEY,
  passed     boolean NOT NULL,
  message    text NOT NULL
) ON COMMIT DROP;

-- Macro para registrar resultado.
CREATE OR REPLACE FUNCTION _assert(
  p_test_id text,
  p_passed  boolean,
  p_message text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _test_results (test_id, passed, message)
  VALUES (p_test_id, p_passed, p_message)
  ON CONFLICT (test_id) DO UPDATE
    SET passed  = EXCLUDED.passed,
        message = EXCLUDED.message;
END;
$$;

-- Helper para correr un bloque SQL simulando un user autenticado.
-- Uso: SELECT _as_user('uuid-here', $$ SELECT ...; $$);
CREATE OR REPLACE FUNCTION _as_user(
  p_user_id uuid,
  p_sql     text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- SET LOCAL no funciona dentro de funciones; usamos un workaround con
  -- SECURITY DEFINER + dynamic SQL.
  EXECUTE format('SET LOCAL role authenticated');
  EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', p_user_id)::text);
  EXECUTE p_sql;
  RESET role;
  RESET request.jwt.claims;
EXCEPTION WHEN OTHERS THEN
  RESET role;
  RESET request.jwt.claims;
  RAISE;
END;
$$;

-- Más simple: usar bloques DO con SET LOCAL (que sí funciona en DO).
-- Reescribimos como bloques individuales abajo.

-- =============================================================================
-- TEST 0: crear fixtures si no existen (idempotente)
-- =============================================================================
-- 4 usuarios + 1 trip con 4 miembros (1 organizer + 3 member) + 1 poll
-- + 1 destination proposal + 1 expense.
-- Se crean con rol `postgres` (bypasea RLS).
-- =============================================================================
DO $$
DECLARE
  v_organizer_id  uuid := '00000000-0000-0000-0000-000000000001';
  v_member_a_id   uuid := '00000000-0000-0000-0000-000000000002';
  v_member_b_id   uuid := '00000000-0000-0000-0000-000000000003';
  v_outsider_id   uuid := '00000000-0000-0000-0000-000000000004';
  v_trip_id       uuid := '11111111-1111-1111-1111-111111111111';
  v_poll_id       uuid := '22222222-2222-2222-2222-222222222222';
  v_proposal_id   uuid := '33333333-3333-3333-3333-333333333333';
  v_expense_id    uuid := '44444444-4444-4444-4444-444444444444';
  v_organizer_tm  uuid;
  v_member_a_tm   uuid;
  v_member_b_tm   uuid;
  v_outsider_tm   uuid;
BEGIN
  -- Crear 4 usuarios solo si no existen
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_organizer_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES
      (v_organizer_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'rls-organizer@plantir.dev', crypt('dev-password', gen_salt('bf')), now(), '{}'::jsonb, now(), now(), '', '', '', ''),
      (v_member_a_id,  '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'rls-member-a@plantir.dev',  crypt('dev-password', gen_salt('bf')), now(), '{}'::jsonb, now(), now(), '', '', '', ''),
      (v_member_b_id,  '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'rls-member-b@plantir.dev',  crypt('dev-password', gen_salt('bf')), now(), '{}'::jsonb, now(), now(), '', '', '', ''),
      (v_outsider_id,  '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'rls-outsider@plantir.dev',  crypt('dev-password', gen_salt('bf')), now(), '{}'::jsonb, now(), now(), '', '', '', '')
    ;
  END IF;

  -- Perfiles
  INSERT INTO public.profiles (id, display_name) VALUES
    (v_organizer_id, 'Organizer RLS'),
    (v_member_a_id,  'Member A RLS'),
    (v_member_b_id,  'Member B RLS'),
    (v_outsider_id,  'Outsider RLS')
  ON CONFLICT (id) DO NOTHING;

  -- Trip
  INSERT INTO public.trips (id, name, state, currency, created_by)
  VALUES (v_trip_id, 'RLS Smoke Trip', 'planning', 'EUR', v_organizer_id)
  ON CONFLICT (id) DO NOTHING;

  -- Resolver trip_member_ids
  SELECT id INTO v_organizer_tm FROM public.trip_members WHERE trip_id = v_trip_id AND user_id = v_organizer_id;
  SELECT id INTO v_member_a_tm  FROM public.trip_members WHERE trip_id = v_trip_id AND user_id = v_member_a_id;
  SELECT id INTO v_member_b_tm  FROM public.trip_members WHERE trip_id = v_trip_id AND user_id = v_member_b_id;

  -- Añadir member_b si el trigger ya creó organizer+a solamente
  IF v_member_b_tm IS NULL THEN
    INSERT INTO public.trip_members (trip_id, user_id, role, display_name)
    VALUES (v_trip_id, v_member_b_id, 'member', 'Member B RLS')
    ON CONFLICT (trip_id, user_id) DO NOTHING
    RETURNING id INTO v_member_b_tm;
  END IF;

  -- Poll
  INSERT INTO public.polls (id, trip_id, kind, status, title, created_by)
  VALUES (v_poll_id, v_trip_id, 'destination', 'open', '¿Dónde?', v_organizer_id)
  ON CONFLICT (trip_id, kind) DO NOTHING;

  -- Proposal
  INSERT INTO public.destination_proposals (id, poll_id, trip_id, title, currency, created_by)
  VALUES (v_proposal_id, v_poll_id, v_trip_id, 'Sierra Nevada', 'EUR', v_organizer_id)
  ON CONFLICT (id) DO NOTHING;

  -- Expense
  INSERT INTO public.expenses (id, trip_id, title, amount_cents, currency, paid_at, paid_by_trip_member_id, category, type, status, strategy, created_by_trip_member_id)
  VALUES (v_expense_id, v_trip_id, 'Cena', 10000, 'EUR', current_date, v_organizer_tm, 'food', 'expense', 'confirmed', 'equal', v_organizer_tm)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'TEST 0: fixtures listas (organizer=%, members=%, outsider=%)',
    substr(v_organizer_id::text, 1, 8), substr(v_member_a_id::text, 1, 8), substr(v_outsider_id::text, 1, 8);
END
$$;

-- =============================================================================
-- TEST 1: Outsider NO ve el trip
-- =============================================================================
-- Esperado: SELECT desde el outsider devuelve 0 filas.
-- =============================================================================
DO $$
DECLARE
  v_outsider_id uuid := '00000000-0000-0000-0000-000000000004';
  v_trip_id    uuid := '11111111-1111-1111-1111-111111111111';
  v_count      int;
BEGIN
  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_outsider_id, 'role', 'authenticated')::text,
    true);

  SELECT count(*) INTO v_count
    FROM public.trips
   WHERE id = v_trip_id;

  RESET role;
  RESET request.jwt.claims;

  PERFORM _assert(
    'T1_outsider_cannot_see_trip',
    v_count = 0,
    format('outsider ve %s filas del trip (esperado 0)', v_count)
  );
END
$$;

-- =============================================================================
-- TEST 2: Miembro SÍ ve el trip Y sus trip_members
-- =============================================================================
DO $$
DECLARE
  v_member_a_id uuid := '00000000-0000-0000-0000-000000000002';
  v_trip_id     uuid := '11111111-1111-1111-1111-111111111111';
  v_trip_count  int;
  v_tm_count    int;
BEGIN
  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_member_a_id, 'role', 'authenticated')::text,
    true);

  SELECT count(*) INTO v_trip_count FROM public.trips WHERE id = v_trip_id;
  SELECT count(*) INTO v_tm_count
    FROM public.trip_members
   WHERE trip_id = v_trip_id;

  RESET role;
  RESET request.jwt.claims;

  PERFORM _assert(
    'T2_member_sees_trip',
    v_trip_count = 1,
    format('member ve %s filas del trip (esperado 1)', v_trip_count)
  );

  PERFORM _assert(
    'T2_member_sees_trip_members',
    v_tm_count >= 3,
    format('member ve %s trip_members (esperado >=3)', v_tm_count)
  );
END
$$;

-- =============================================================================
-- TEST 3: Outsider NO ve trip_members del trip
-- =============================================================================
DO $$
DECLARE
  v_outsider_id uuid := '00000000-0000-0000-0000-000000000004';
  v_trip_id     uuid := '11111111-1111-1111-1111-111111111111';
  v_count       int;
BEGIN
  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_outsider_id, 'role', 'authenticated')::text,
    true);

  SELECT count(*) INTO v_count
    FROM public.trip_members
   WHERE trip_id = v_trip_id;

  RESET role;
  RESET request.jwt.claims;

  PERFORM _assert(
    'T3_outsider_cannot_see_trip_members',
    v_count = 0,
    format('outsider ve %s trip_members del trip (esperado 0)', v_count)
  );
END
$$;

-- =============================================================================
-- TEST 4: Member (NO organizer) NO puede cerrar un poll (UPDATE status=closed)
-- =============================================================================
DO $$
DECLARE
  v_member_a_id uuid := '00000000-0000-0000-0000-000000000002';
  v_poll_id     uuid := '22222222-2222-2222-2222-222222222222';
  v_updated     int;
BEGIN
  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_member_a_id, 'role', 'authenticated')::text,
    true);

  -- INTENTO: cerrar el poll (UPDATE status='closed').
  -- Esperado: 0 rows updated (RLS bloquea el WHERE clause de la policy).
  UPDATE public.polls
     SET status = 'closed', closed_at = now()
   WHERE id = v_poll_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RESET role;
  RESET request.jwt.claims;

  PERFORM _assert(
    'T4_member_cannot_close_poll',
    v_updated = 0,
    format('member actualizó %s polls (esperado 0)', v_updated)
  );
END
$$;

-- =============================================================================
-- TEST 5: Member (NO creator, NO admin) NO puede editar expense ajena
-- =============================================================================
DO $$
DECLARE
  v_member_a_id uuid := '00000000-0000-0000-0000-000000000002';
  v_expense_id  uuid := '44444444-4444-4444-4444-444444444444';
  v_updated     int;
BEGIN
  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_member_a_id, 'role', 'authenticated')::text,
    true);

  -- INTENTO: cambiar el título de la expense (que es del organizer).
  UPDATE public.expenses
     SET title = 'OTRO TITULO'
   WHERE id = v_expense_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RESET role;
  RESET request.jwt.claims;

  PERFORM _assert(
    'T5_member_cannot_edit_others_expense',
    v_updated = 0,
    format('member actualizó %s expenses ajenas (esperado 0)', v_updated)
  );
END
$$;

-- =============================================================================
-- TEST 6: Authenticated NO puede INSERT en activity_log (solo service_role)
-- =============================================================================
DO $$
DECLARE
  v_member_a_id uuid := '00000000-0000-0000-0000-000000000002';
  v_trip_id     uuid := '11111111-1111-1111-1111-111111111111';
  v_blocked     boolean := false;
BEGIN
  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_member_a_id, 'role', 'authenticated')::text,
    true);

  BEGIN
    INSERT INTO public.activity_log (trip_id, user_id, activity_type, entity_type, entity_id)
    VALUES (v_trip_id, v_member_a_id, 'trip_created', 'trip', v_trip_id);
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked := true;
  WHEN OTHERS THEN
    -- Algunos clientes devuelven código 42501 (RLS violation) en lugar de insufficient_privilege.
    IF SQLSTATE = '42501' THEN
      v_blocked := true;
    ELSE
      RAISE;
    END IF;
  END;

  RESET role;
  RESET request.jwt.claims;

  PERFORM _assert(
    'T6_authenticated_cannot_insert_activity_log',
    v_blocked,
    format('authenticated NO fue bloqueado al insertar en activity_log')
  );
END
$$;

-- =============================================================================
-- TEST 7: Settlements con from=to viola CHECK
-- =============================================================================
DO $$
DECLARE
  v_organizer_tm  uuid;
  v_trip_id       uuid := '11111111-1111-1111-1111-111111111111';
  v_blocked       boolean := false;
BEGIN
  SELECT id INTO v_organizer_tm
    FROM public.trip_members
   WHERE trip_id = v_trip_id
     AND role = 'organizer'
     AND status = 'active'
   LIMIT 1;

  BEGIN
    INSERT INTO public.settlement_suggestions
      (trip_id, from_trip_member_id, to_trip_member_id, amount_cents, currency)
    VALUES
      (v_trip_id, v_organizer_tm, v_organizer_tm, 100, 'EUR');
  EXCEPTION WHEN check_violation THEN
    v_blocked := true;
  WHEN OTHERS THEN
    IF SQLSTATE = '23514' THEN
      v_blocked := true;
    ELSE
      RAISE;
    END IF;
  END;

  PERFORM _assert(
    'T7_settlement_from_neq_to',
    v_blocked,
    'settlement_suggestions con from=to NO fue rechazado'
  );
END
$$;

-- =============================================================================
-- TEST 8: expense_splits con suma de percentages != 100
-- =============================================================================
DO $$
DECLARE
  v_trip_id      uuid := '11111111-1111-1111-1111-111111111111';
  v_expense_id   uuid := '99999999-9999-9999-9999-999999999999';  -- nueva
  v_tm_a         uuid;
  v_tm_b         uuid;
  v_blocked      boolean := false;
BEGIN
  -- Crear expense con strategy=percent (con service_role via rol postgres)
  SELECT id INTO v_tm_a FROM public.trip_members
   WHERE trip_id = v_trip_id AND role = 'organizer' AND status = 'active' LIMIT 1;
  SELECT id INTO v_tm_b FROM public.trip_members
   WHERE trip_id = v_trip_id AND user_id = '00000000-0000-0000-0000-000000000003' LIMIT 1;

  INSERT INTO public.expenses (
    id, trip_id, title, amount_cents, currency, paid_at,
    paid_by_trip_member_id, category, strategy,
    created_by_trip_member_id
  )
  VALUES (
    v_expense_id, v_trip_id, 'Test percent', 10000, 'EUR', current_date,
    v_tm_a, 'food', 'percent', v_tm_a
  ) ON CONFLICT (id) DO NOTHING;

  -- INTENTO: insertar splits con suma 50+30=80 (≠ 100).
  BEGIN
    INSERT INTO public.expense_splits (expense_id, trip_member_id, percentage, included)
    VALUES
      (v_expense_id, v_tm_a, 50.00, true),
      (v_expense_id, v_tm_b, 30.00, true);
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  -- Limpiar
  DELETE FROM public.expenses WHERE id = v_expense_id;

  PERFORM _assert(
    'T8_splits_percent_must_sum_100',
    v_blocked,
    'splits con suma 80% NO fue rechazada por el trigger'
  );
END
$$;

-- =============================================================================
-- TEST 9: expense.currency != trip.currency se rechaza
-- =============================================================================
DO $$
DECLARE
  v_trip_id    uuid := '11111111-1111-1111-1111-111111111111';
  v_expense_id uuid := '99999999-9999-9999-9999-999999999998';
  v_tm_a       uuid;
  v_blocked    boolean := false;
BEGIN
  SELECT id INTO v_tm_a FROM public.trip_members
   WHERE trip_id = v_trip_id AND role = 'organizer' AND status = 'active' LIMIT 1;

  BEGIN
    INSERT INTO public.expenses (
      id, trip_id, title, amount_cents, currency, paid_at,
      paid_by_trip_member_id, category, strategy,
      created_by_trip_member_id
    )
    VALUES (
      v_expense_id, v_trip_id, 'Test currency', 100, 'USD', current_date,
      v_tm_a, 'food', 'equal', v_tm_a
    );
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  PERFORM _assert(
    'T9_expense_currency_matches_trip',
    v_blocked,
    'expense con currency distinta al trip NO fue rechazada'
  );
END
$$;

-- =============================================================================
-- TEST 10: trip_invites con used_count > max_uses se rechaza
-- =============================================================================
DO $$
DECLARE
  v_trip_id  uuid := '11111111-1111-1111-1111-111111111111';
  v_blocked  boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.trip_invites (
      trip_id, token_hash, created_by, max_uses, used_count
    )
    VALUES (
      v_trip_id, 'fake-hash-1234', '00000000-0000-0000-0000-000000000001',
      10, 20  -- used_count > max_uses
    );
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  PERFORM _assert(
    'T10_invite_used_le_max',
    v_blocked,
    'invite con used_count > max_uses NO fue rechazado'
  );
END
$$;

-- =============================================================================
-- TEST 11: trip_members con 2 organizadores activos se rechaza
-- =============================================================================
DO $$
DECLARE
  v_trip_id      uuid := '11111111-1111-1111-1111-111111111111';
  v_member_a_id  uuid := '00000000-0000-0000-0000-000000000002';
  v_blocked      boolean := false;
BEGIN
  -- INTENTO: ascender a member_a a organizer (ya hay un organizer activo).
  BEGIN
    UPDATE public.trip_members
       SET role = 'organizer'
     WHERE trip_id = v_trip_id
       AND user_id = v_member_a_id;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  PERFORM _assert(
    'T11_single_organizer_invariant',
    v_blocked,
    '2do organizer activo NO fue rechazado por el trigger de invariante'
  );
END
$$;

-- =============================================================================
-- TEST 12: date_availability_votes en poll cerrado se rechaza (can_vote_poll)
-- =============================================================================
DO $$
DECLARE
  v_member_a_id uuid := '00000000-0000-0000-0000-000000000002';
  v_poll_id     uuid := '22222222-2222-2222-2222-222222222222';
  v_blocked     boolean := false;
  v_vote_count  int;
BEGIN
  -- Forzar cierre del poll (con service_role via postgres)
  UPDATE public.polls SET status = 'closed', closed_at = now() WHERE id = v_poll_id;

  -- INTENTO: votar con member_a en el poll cerrado
  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_member_a_id, 'role', 'authenticated')::text,
    true);

  BEGIN
    INSERT INTO public.date_availability_votes (poll_id, user_id, day, level)
    VALUES (v_poll_id, v_member_a_id, current_date, 'available');
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  GET DIAGNOSTICS v_vote_count = ROW_COUNT;

  RESET role;
  RESET request.jwt.claims;

  -- Re-abrir el poll para no contaminar el estado
  UPDATE public.polls SET status = 'open', closed_at = NULL WHERE id = v_poll_id;

  PERFORM _assert(
    'T12_cannot_vote_closed_poll',
    v_blocked OR v_vote_count = 0,
    format('voto en poll cerrado fue aceptado (blocked=%, count=%)', v_blocked, v_vote_count)
  );
END
$$;

-- =============================================================================
-- TEST 13: profiles update por OTRO user se rechaza
-- =============================================================================
DO $$
DECLARE
  v_member_a_id  uuid := '00000000-0000-0000-0000-000000000002';
  v_member_b_id  uuid := '00000000-0000-0000-0000-000000000003';
  v_updated      int;
BEGIN
  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_member_a_id, 'role', 'authenticated')::text,
    true);

  -- member_a intenta cambiar el display_name de member_b
  UPDATE public.profiles
     SET display_name = 'Hacked'
   WHERE id = v_member_b_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RESET role;
  RESET request.jwt.claims;

  PERFORM _assert(
    'T13_cannot_update_other_profile',
    v_updated = 0,
    format('member actualizó %s profiles ajenas (esperado 0)', v_updated)
  );
END
$$;

-- =============================================================================
-- TEST 14: notifications select por OTRO user devuelve 0
-- =============================================================================
-- (No se hace INSERT porque solo service_role puede; basta con verificar
-- que un user no ve las notifications de otro.)
-- =============================================================================
DO $$
DECLARE
  v_member_a_id  uuid := '00000000-0000-0000-0000-000000000002';
  v_member_b_id  uuid := '00000000-0000-0000-0000-000000000003';
  v_count        int;
BEGIN
  -- Insertar una notification para member_b (bypaseando RLS con rol postgres)
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (v_member_b_id, 'generic', 'Test', 'Body')
  ON CONFLICT DO NOTHING;

  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_member_a_id, 'role', 'authenticated')::text,
    true);

  SELECT count(*) INTO v_count
    FROM public.notifications
   WHERE user_id = v_member_b_id;

  RESET role;
  RESET request.jwt.claims;

  PERFORM _assert(
    'T14_cannot_see_other_notifications',
    v_count = 0,
    format('member ve %s notifications de otro (esperado 0)', v_count)
  );

  -- Limpiar
  DELETE FROM public.notifications WHERE user_id = v_member_b_id;
END
$$;

-- =============================================================================
-- Resumen final
-- =============================================================================
DO $$
DECLARE
  v_total   int;
  v_passed  int;
  v_failed  int;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE passed), count(*) FILTER (WHERE NOT passed)
    INTO v_total, v_passed, v_failed
    FROM _test_results;

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'RLS Smoke Test — Resumen';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Total: % | Pasados: % | Fallados: %', v_total, v_passed, v_failed;
  RAISE NOTICE '----------------------------------------------------';

  IF v_failed > 0 THEN
    RAISE NOTICE 'TESTS FALLADOS:';
    FOR v_passed IN
      SELECT 1 FROM _test_results WHERE NOT passed
    LOOP
      RAISE NOTICE '  - %: %', (SELECT test_id FROM _test_results WHERE NOT passed LIMIT 1),
                              (SELECT message FROM _test_results WHERE NOT passed LIMIT 1);
    END LOOP;
    RAISE EXCEPTION 'rls-smoke: % tests fallaron', v_failed;
  END IF;

  RAISE NOTICE 'rls-smoke: ALL TESTS PASSED';
END
$$;
