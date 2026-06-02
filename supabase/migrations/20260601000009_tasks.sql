-- =============================================================================
-- Migración 9: tasks
-- =============================================================================
-- Lista de tareas compartidas del viaje. Funcionalidad limitada en MVP
-- (PRD §5.3 la lista como v1) pero la tabla existe desde el MVP para no
-- romper tipos en una migración posterior.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id                       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                  uuid         NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title                    text         NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description              text         NULL,
  status                   task_status  NOT NULL DEFAULT 'todo',
  -- FK a trip_members (no a auth.users) para multi-tenancy seguro: aunque el
  -- user salga del trip, la asignación histórica se preserva.
  assigned_to_trip_member_id uuid       NULL REFERENCES public.trip_members(id) ON DELETE SET NULL,
  due_at                   timestamptz  NULL,
  created_by               uuid         NOT NULL REFERENCES auth.users(id),
  created_at               timestamptz  NOT NULL DEFAULT now(),
  updated_at               timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.tasks                IS 'Tareas del viaje (limitado en MVP, completo en v1).';
COMMENT ON COLUMN public.tasks.assigned_to_trip_member_id
  IS 'FK a trip_members (no a users) para preservar asignación si el user sale del trip.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_tasks_trip      ON public.tasks (trip_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at    ON public.tasks (due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee  ON public.tasks (assigned_to_trip_member_id);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_tasks_updated_at'
      AND tgrelid = 'public.tasks'::regclass
  ) THEN
    CREATE TRIGGER set_tasks_updated_at
      BEFORE UPDATE ON public.tasks
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- RLS flag
-- -----------------------------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE  ROW LEVEL SECURITY;
