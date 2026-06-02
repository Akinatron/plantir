-- =============================================================================
-- Migración 4: trips + trip_members
-- =============================================================================
-- trips          -> unidad de organización de un grupo
-- trip_members   -> relación N:M users <-> trips con rol
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: trips
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      text        NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  description               text        NULL CHECK (description IS NULL OR length(description) <= 500),
  state                     trip_status NOT NULL DEFAULT 'group_created',
  -- Fechas decididas. Ambas null hasta pasar a 'date_decided'.
  start_date                date        NULL,
  end_date                  date        NULL,
  -- FK a destination_proposals (definida en migración 7) — DEFERRABLE para que
  -- un INSERT del proposal + UPDATE del trip pueda ir en la misma transacción.
  destination_proposal_id   uuid        NULL,
  -- Moneda del viaje (ISO-4217). char(3) fija el largo a 3 letras exactas.
  currency                  char(3)     NOT NULL,
  -- URL de la foto de portada. En MVP, URL externa; storage en v1.
  cover_url                 text        NULL,
  -- Auditoría
  created_by                uuid        NOT NULL REFERENCES auth.users(id),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  closed_at                 timestamptz NULL,
  archived_at               timestamptz NULL,

  -- Invariantes de producto
  CONSTRAINT chk_trip_dates_order      CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_trip_closed_consistent CHECK ((closed_at IS NULL) = (state <> 'closed'))
);

COMMENT ON TABLE  public.trips                IS 'Unidad de viaje. Cada fila es un viaje planificado por un grupo.';
COMMENT ON COLUMN public.trips.state          IS 'Máquina de estados del viaje (ver trip_status enum).';
COMMENT ON COLUMN public.trips.currency       IS 'ISO-4217 3 letras. Fija en creación.';
COMMENT ON COLUMN public.trips.start_date     IS 'Día de inicio decidido. NULL hasta date_decided.';
COMMENT ON COLUMN public.trips.end_date       IS 'Día de fin decidido. NULL hasta date_decided.';
COMMENT ON COLUMN public.trips.closed_at      IS 'Timestamp de cierre. NULL si state != closed.';

-- -----------------------------------------------------------------------------
-- Tabla: trip_members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_members (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid         NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id      uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         member_role  NOT NULL DEFAULT 'member',
  status       member_status NOT NULL DEFAULT 'active',
  -- Cache de display_name y avatar_url del profile al momento del join.
  -- Se usa para mostrar listas históricas aunque el user cambie su profile.
  display_name text         NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  avatar_url   text         NULL,
  joined_at    timestamptz  NOT NULL DEFAULT now(),
  left_at      timestamptz  NULL,

  -- Constraint de unicidad lógica (un user solo aparece una vez por trip,
  -- incluso si salió y volvió a entrar; se prefiere reactivate a duplicar).
  CONSTRAINT uniq_trip_member UNIQUE (trip_id, user_id)
);

COMMENT ON TABLE  public.trip_members            IS 'Membresía de un usuario en un viaje (rol + status).';
COMMENT ON COLUMN public.trip_members.role       IS 'organizer = admin; member = participante normal.';
COMMENT ON COLUMN public.trip_members.status     IS 'active | left | removed. left/removed preservan histórico.';
COMMENT ON COLUMN public.trip_members.left_at    IS 'Timestamp de salida. Preserva FK desde expenses/settlements.';

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_trips_created_by        ON public.trips (created_by);
CREATE INDEX IF NOT EXISTS idx_trips_state             ON public.trips (state);
CREATE INDEX IF NOT EXISTS idx_trips_start_date        ON public.trips (start_date);

CREATE INDEX IF NOT EXISTS idx_trip_members_trip       ON public.trip_members (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user       ON public.trip_members (user_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_user  ON public.trip_members (trip_id, user_id);
-- Para listar "mis viajes activos":
CREATE INDEX IF NOT EXISTS idx_trip_members_user_active
  ON public.trip_members (user_id)
  WHERE status = 'active';

-- -----------------------------------------------------------------------------
-- Trigger: añadir automáticamente al creator como 'organizer' al crear trip
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_trip_add_creator_as_organizer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_avatar_url   text;
BEGIN
  -- Lee el profile del creator para cachear display_name/avatar.
  SELECT display_name, avatar_url
    INTO v_display_name, v_avatar_url
    FROM public.profiles
   WHERE id = NEW.created_by;

  -- Fallback si el profile aún no existe (no debería, pero defensivo).
  IF v_display_name IS NULL THEN
    v_display_name := 'Organizer';
  END IF;

  INSERT INTO public.trip_members (trip_id, user_id, role, display_name, avatar_url)
  VALUES (NEW.id, NEW.created_by, 'organizer', v_display_name, v_avatar_url);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_trip_add_creator_as_organizer()
  IS 'Tras insertar un trip, añade al creator como organizer (cached profile).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_trip_add_creator'
      AND tgrelid = 'public.trips'::regclass
  ) THEN
    CREATE TRIGGER trg_trip_add_creator
      AFTER INSERT ON public.trips
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_trip_add_creator_as_organizer();
  END IF;
END
$$;

-- Trigger updated_at para trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_trips_updated_at'
      AND tgrelid = 'public.trips'::regclass
  ) THEN
    CREATE TRIGGER set_trips_updated_at
      BEFORE UPDATE ON public.trips
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Invariante: exactamente 1 organizer activo por trip
-- -----------------------------------------------------------------------------
-- Se valida con un constraint deferrable en el trigger (no es CHECK normal
-- porque es agregación sobre filas). Aquí definimos la función que la
-- valida en operaciones de UPDATE/INSERT/DELETE.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_check_single_organizer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- OLD hace referencia a la fila borrada.
    IF OLD.role = 'organizer' AND OLD.status = 'active' THEN
      SELECT count(*) INTO v_count
        FROM public.trip_members
       WHERE trip_id = OLD.trip_id
         AND id <> OLD.id
         AND role = 'organizer'
         AND status = 'active';
      IF v_count = 0 THEN
        RAISE EXCEPTION
          'trip_invariant: cannot remove the last active organizer of trip %', OLD.trip_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- INSERT o UPDATE: si NEW es organizer activo, asegurar que no haya otro.
  IF NEW.role = 'organizer' AND NEW.status = 'active' THEN
    SELECT count(*) INTO v_count
      FROM public.trip_members
     WHERE trip_id = NEW.trip_id
       AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND role = 'organizer'
       AND status = 'active';
    IF v_count > 0 THEN
      RAISE EXCEPTION
        'trip_invariant: trip % already has an active organizer', NEW.trip_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_check_single_organizer()
  IS 'Invariante: cada trip tiene EXACTAMENTE 1 organizer activo.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_trip_member_check_organizer'
      AND tgrelid = 'public.trip_members'::regclass
  ) THEN
    CREATE TRIGGER trg_trip_member_check_organizer
      BEFORE INSERT OR UPDATE OR DELETE ON public.trip_members
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_check_single_organizer();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- RLS flag (las políticas van en 20260601000015_rls_policies.sql)
-- -----------------------------------------------------------------------------
ALTER TABLE public.trips        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips        FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members FORCE  ROW LEVEL SECURITY;
