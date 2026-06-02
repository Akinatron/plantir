-- =============================================================================
-- Migración 6: polls + date_poll_allowed_ranges + date_availability_votes
--                + date_poll_results
-- =============================================================================
-- Un trip tiene hasta 2 polls: 1 'date' + 1 'destination' (constraint uniq).
-- date_poll_allowed_ranges: rangos [start,end] permitidos para votar.
-- date_availability_votes: 1 fila por (poll, user, day).
-- date_poll_results: snapshot de scores al cerrar el poll.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: polls
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.polls (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid         NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  kind        poll_type    NOT NULL,
  status      poll_status  NOT NULL DEFAULT 'open',
  title       text         NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  -- Cierre automático opcional (null = solo cierre manual).
  closes_at   timestamptz  NULL,
  created_by  uuid         NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz  NOT NULL DEFAULT now(),
  closed_at   timestamptz  NULL,
  -- Cuando se cierra un date_poll, se persiste la fecha ganadora aquí
  -- (también queda en trips.start_date / end_date).
  chosen_date date         NULL,

  -- Constraint: 1 poll de cada kind por trip.
  CONSTRAINT uniq_trip_poll_kind UNIQUE (trip_id, kind),
  -- Si está cerrado, debe tener closed_at; si no, no.
  CONSTRAINT chk_poll_closed_consistent
    CHECK ((status = 'closed') = (closed_at IS NOT NULL))
);

COMMENT ON TABLE  public.polls           IS 'Poll de un trip: kind = date | destination. Máximo 1 de cada por trip.';
COMMENT ON COLUMN public.polls.closes_at IS 'Cierre automático (null = solo manual).';
COMMENT ON COLUMN public.polls.chosen_date IS 'Fecha ganadora (solo para kind=date). Persistido al cerrar.';

-- -----------------------------------------------------------------------------
-- Tabla: date_poll_allowed_ranges
-- -----------------------------------------------------------------------------
-- El organizer puede definir 1..N rangos permitidos [start_date, end_date]
-- para votar. Las filas se comprueban en la Edge Function close-date-poll /
-- en RLS al insertar votos.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.date_poll_allowed_ranges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    uuid        NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  start_date date        NOT NULL,
  end_date   date        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_date_range_order CHECK (end_date >= start_date)
);

COMMENT ON TABLE public.date_poll_allowed_ranges
  IS 'Rangos [start,end] permitidos para votar en un date_poll. Mínimo 1 fila por poll activo.';

CREATE INDEX IF NOT EXISTS idx_date_poll_allowed_ranges_poll
  ON public.date_poll_allowed_ranges (poll_id);

-- -----------------------------------------------------------------------------
-- Tabla: date_availability_votes
-- -----------------------------------------------------------------------------
-- Cada miembro vota su disponibilidad por cada día permitido del poll.
-- Pesos (definidos en la lógica de aplicación):
--   available   -> 1.0
--   prefer      -> 1.5
--   maybe       -> 0.5
--   unavailable -> 0.0
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.date_availability_votes (
  id         uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    uuid             NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id    uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day        date             NOT NULL,
  level      availability_type NOT NULL,
  note       text             NULL CHECK (note IS NULL OR length(note) <= 280),
  created_at timestamptz      NOT NULL DEFAULT now(),
  updated_at timestamptz      NOT NULL DEFAULT now(),

  -- Un voto por (poll, user, day) -> upsert idempotente.
  CONSTRAINT uniq_date_vote_per_user_day UNIQUE (poll_id, user_id, day)
);

COMMENT ON TABLE  public.date_availability_votes
  IS 'Voto de disponibilidad por (poll, user, day). Pesos: available=1, prefer=1.5, maybe=0.5, unavailable=0.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_date_avail_votes_poll
  ON public.date_availability_votes (poll_id);
CREATE INDEX IF NOT EXISTS idx_date_avail_votes_poll_user
  ON public.date_availability_votes (poll_id, user_id);
-- Para heatmap: agregaciones por día dentro de un poll.
CREATE INDEX IF NOT EXISTS idx_date_avail_votes_poll_day
  ON public.date_availability_votes (poll_id, day);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_date_avail_votes_updated_at'
      AND tgrelid = 'public.date_availability_votes'::regclass
  ) THEN
    CREATE TRIGGER set_date_avail_votes_updated_at
      BEFORE UPDATE ON public.date_availability_votes
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Tabla: date_poll_results
-- -----------------------------------------------------------------------------
-- Snapshot inmutable de los scores cuando se cierra el poll. Permite auditoría
-- histórica y reduce coste de recálculo en dashboards.
-- En MVP se rellena al cerrar el poll (Edge Function compute-date-poll-results).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.date_poll_results (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      uuid        NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  day          date        NOT NULL,
  -- Score ponderado: sum(weight * 1 si level=available, etc.)
  score        numeric(10,2) NOT NULL,
  -- Desglose: nº de votos por nivel (para mostrar "5 sí / 1 no / 1 quizá").
  votes_available   int     NOT NULL DEFAULT 0,
  votes_prefer      int     NOT NULL DEFAULT 0,
  votes_maybe       int     NOT NULL DEFAULT 0,
  votes_unavailable int     NOT NULL DEFAULT 0,
  -- Ranking dentro del poll (1 = ganador). Permite ORDER BY rank ASC.
  rank         int         NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now(),

  -- Cada (poll, day) tiene una sola fila de resultados.
  CONSTRAINT uniq_date_poll_result UNIQUE (poll_id, day),
  -- rank >= 1
  CONSTRAINT chk_result_rank_positive CHECK (rank >= 1)
);

COMMENT ON TABLE  public.date_poll_results IS 'Snapshot de scores al cerrar el date_poll. Relleno por Edge Function.';

CREATE INDEX IF NOT EXISTS idx_date_poll_results_poll_rank
  ON public.date_poll_results (poll_id, rank);

-- -----------------------------------------------------------------------------
-- RLS flags
-- -----------------------------------------------------------------------------
ALTER TABLE public.polls                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls                     FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.date_poll_allowed_ranges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_poll_allowed_ranges  FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.date_availability_votes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_availability_votes   FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.date_poll_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_poll_results         FORCE  ROW LEVEL SECURITY;
