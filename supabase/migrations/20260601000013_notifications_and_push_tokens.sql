-- =============================================================================
-- Migración 13: notifications + push_tokens
-- =============================================================================
-- notifications -> bandeja in-app de cada usuario.
-- push_tokens   -> tokens FCM/APNs para push (v1; definido en MVP).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid               NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       notification_type  NOT NULL,
  title      text               NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body       text               NOT NULL CHECK (length(body)  BETWEEN 1 AND 500),
  -- Payload estructurado para deep links / acciones (sin PII).
  data       jsonb              NOT NULL DEFAULT '{}'::jsonb,
  read_at    timestamptz        NULL,
  created_at timestamptz        NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.notifications IS 'Bandeja in-app del usuario. Generada por Edge Functions (service_role).';

-- Índices
-- Bandeja: notificaciones no leídas del usuario, ordenadas desc.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;
-- Listado completo del usuario.
CREATE INDEX IF NOT EXISTS idx_notifications_user_all
  ON public.notifications (user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Tabla: push_tokens
-- -----------------------------------------------------------------------------
-- 1 fila por (user_id, token). Si el mismo user instala en 2 dispositivos
-- del mismo OS, hay 2 filas distintas.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token        text        NOT NULL,
  platform     text        NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id    text        NULL,
  app_version  text        NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uniq_user_token UNIQUE (user_id, token)
);

COMMENT ON TABLE public.push_tokens IS 'Tokens de push por usuario. service_role gestiona alta/baja.';

CREATE INDEX IF NOT EXISTS idx_push_tokens_user
  ON public.push_tokens (user_id);

-- -----------------------------------------------------------------------------
-- RLS flags
-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens   FORCE  ROW LEVEL SECURITY;
