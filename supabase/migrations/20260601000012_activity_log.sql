-- =============================================================================
-- Migración 12: activity_log
-- =============================================================================
-- Bitácora inmutable de eventos del viaje. INSERT solo permitido a
-- service_role (Edge Functions con supabaseAdmin). Cliente nunca inserta
-- directamente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid          NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id      uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  -- Tipo e id de la entidad afectada (polimórfica, no FK por flexibilidad).
  entity_type  text          NOT NULL CHECK (length(entity_type) BETWEEN 1 AND 50),
  entity_id    uuid          NULL,
  -- Metadata libre: payload mínimo para reconstruir el feed.
  metadata     jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.activity_log IS 'Bitácora inmutable. INSERT solo via service_role (Edge Functions).';
COMMENT ON COLUMN public.activity_log.metadata IS 'JSON libre. No incluir PII sensible ni tokens.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_activity_log_trip_created
  ON public.activity_log (trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user
  ON public.activity_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type
  ON public.activity_log (activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity
  ON public.activity_log (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- RLS: SELECT para miembros; INSERT/UPDATE/DELETE bloqueados para authenticated
-- -----------------------------------------------------------------------------
-- Habilitamos RLS + FORCE y solo creamos la política de SELECT aquí.
-- Las políticas de INSERT/UPDATE/DELETE NO se crean -> con FORCE RLS,
-- cualquier intento desde un rol sin política explícita es denegado.
-- El service_role bypasea RLS (supabase_admin), por lo que las Edge
-- Functions pueden insertar sin problemas.
-- -----------------------------------------------------------------------------
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log FORCE  ROW LEVEL SECURITY;

-- La política SELECT se define en 20260601000015_rls_policies.sql.
-- Aquí dejamos el flag y un comentario para que quede claro el contrato.
