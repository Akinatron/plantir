-- =============================================================================
-- Migración 14: RLS Helper Functions
-- =============================================================================
-- Funciones SQL reutilizables en las políticas RLS. Marcar SECURITY DEFINER
-- y STABLE para que:
--   * SECURITY DEFINER: ejecuten con permisos del owner (evita recursion RLS
--     cuando la policy se evalúa sobre trip_members y la propia función
--     necesita leer trip_members).
--   * STABLE: el planner puede cachear el resultado dentro de la misma query
--     (importante: las funciones pueden llamarse varias veces por fila).
-- Permisos: GRANT EXECUTE TO authenticated, anon (lo que aplique).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: trip_id del caller (lee el JWT vía auth.uid())
-- -----------------------------------------------------------------------------
-- Útil para reducir repeticiones en policies que filtran por auth.uid().
-- No es SECURITY DEFINER porque solo lee auth.uid() (no tabla propia).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- is_trip_member(trip_id, user_id) -> boolean
-- -----------------------------------------------------------------------------
-- true si el user es miembro activo del trip.
-- SECURITY DEFINER para que pueda leer trip_members sin verse afectado por las
-- propias policies que filtran trip_members.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.trip_members
     WHERE trip_id  = p_trip_id
       AND user_id  = p_user_id
       AND status   = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_trip_member(uuid, uuid)
  IS 'true si p_user_id es miembro activo (status=active) de p_trip_id.';

GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid, uuid)
  TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- is_trip_admin(trip_id, user_id) -> boolean
-- -----------------------------------------------------------------------------
-- true si el user es organizer activo del trip (= "owner" del PRD).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_trip_admin(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.trip_members
     WHERE trip_id  = p_trip_id
       AND user_id  = p_user_id
       AND role     = 'organizer'
       AND status   = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_trip_admin(uuid, uuid)
  IS 'true si p_user_id es organizer activo (= "owner" en PRD) de p_trip_id.';

GRANT EXECUTE ON FUNCTION public.is_trip_admin(uuid, uuid)
  TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- can_manage_trip(trip_id, user_id) -> boolean
-- -----------------------------------------------------------------------------
-- Equivalente a is_trip_admin en MVP. Definido por separado para semántica:
-- "puede editar/eliminar el trip" vs "tiene rol organizer" (que podría
-- evolucionar a admin/owner en v1).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_trip(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_trip_admin(p_trip_id, p_user_id);
$$;

COMMENT ON FUNCTION public.can_manage_trip(uuid, uuid)
  IS 'true si p_user_id puede gestionar (editar/cerrar/eliminar) p_trip_id. = is_trip_admin en MVP.';

GRANT EXECUTE ON FUNCTION public.can_manage_trip(uuid, uuid)
  TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- can_vote_poll(poll_id, user_id) -> boolean
-- -----------------------------------------------------------------------------
-- true si el poll está abierto Y el user es miembro activo del trip del poll.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_vote_poll(p_poll_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.polls p
     WHERE p.id = p_poll_id
       AND p.status = 'open'
       AND public.is_trip_member(p.trip_id, p_user_id)
  );
$$;

COMMENT ON FUNCTION public.can_vote_poll(uuid, uuid)
  IS 'true si el poll está abierto y el user es miembro activo del trip del poll.';

GRANT EXECUTE ON FUNCTION public.can_vote_poll(uuid, uuid)
  TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- can_create_destination_proposal(poll_id, user_id) -> boolean
-- -----------------------------------------------------------------------------
-- true si el poll es de tipo 'destination', está abierto, y el user es
-- miembro activo. El límite de 5 propuestas por user se valida en la Edge
-- Function (no en SQL para no romper la política con COUNT()).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_create_destination_proposal(p_poll_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.polls p
     WHERE p.id = p_poll_id
       AND p.kind = 'destination'
       AND p.status = 'open'
       AND public.is_trip_member(p.trip_id, p_user_id)
  );
$$;

COMMENT ON FUNCTION public.can_create_destination_proposal(uuid, uuid)
  IS 'true si el poll es destination, está abierto, y el user es miembro activo.';

GRANT EXECUTE ON FUNCTION public.can_create_destination_proposal(uuid, uuid)
  TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- can_manage_expense(expense_id, user_id) -> boolean
-- -----------------------------------------------------------------------------
-- true si el user es organizer del trip del expense, o creó el expense
-- (created_by_trip_member_id.user_id == p_user_id).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_expense(p_expense_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.expenses e
      LEFT JOIN public.trip_members tm_creator
        ON tm_creator.id = e.created_by_trip_member_id
     WHERE e.id = p_expense_id
       AND (
         public.is_trip_admin(e.trip_id, p_user_id)
         OR (tm_creator.user_id = p_user_id AND tm_creator.status = 'active')
       )
  );
$$;

COMMENT ON FUNCTION public.can_manage_expense(uuid, uuid)
  IS 'true si el user es organizer del trip del expense, o es el creator (member activo).';

GRANT EXECUTE ON FUNCTION public.can_manage_expense(uuid, uuid)
  TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- Helper extra: is_trip_member_from_poll(poll_id, user_id) -> boolean
-- Usado por policies de date_availability_votes y destination_votes que
-- reciben poll_id y necesitan validar membresía del trip del poll.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_trip_member_from_poll(p_poll_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.polls p
     WHERE p.id = p_poll_id
       AND public.is_trip_member(p.trip_id, p_user_id)
  );
$$;

COMMENT ON FUNCTION public.is_trip_member_from_poll(uuid, uuid)
  IS 'true si el user es miembro activo del trip al que pertenece el poll.';

GRANT EXECUTE ON FUNCTION public.is_trip_member_from_poll(uuid, uuid)
  TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- Helper extra: trip_id del poll (usado en policies sin denormalizar).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trip_id_from_poll(p_poll_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT trip_id FROM public.polls WHERE id = p_poll_id;
$$;

COMMENT ON FUNCTION public.trip_id_from_poll(uuid)
  IS 'Devuelve trip_id del poll. NULL si el poll no existe.';

GRANT EXECUTE ON FUNCTION public.trip_id_from_poll(uuid)
  TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- Helper extra: trip_id desde expense_id (para policies de splits/payers).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trip_id_from_expense(p_expense_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT trip_id FROM public.expenses WHERE id = p_expense_id;
$$;

COMMENT ON FUNCTION public.trip_id_from_expense(uuid)
  IS 'Devuelve trip_id del expense. NULL si el expense no existe.';

GRANT EXECUTE ON FUNCTION public.trip_id_from_expense(uuid)
  TO authenticated, anon;
