-- =============================================================================
-- Migración 3: Tabla profiles
-- =============================================================================
-- Una fila por cada usuario registrado en auth.users. Se crea automáticamente
-- mediante un trigger AFTER INSERT sobre auth.users.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  -- Mismo id que auth.users.id (1:1) — NO usamos gen_random_uuid separado.
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text        NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  avatar_url    text        NULL,
  -- Locale del usuario (es-ES por defecto). Útil para formateo de moneda/fecha.
  locale        text        NOT NULL DEFAULT 'es-ES',
  -- Teléfono opcional (se usa en v1 para deep link "Pedir nuevo link al organizer").
  phone         text        NULL,
  -- Timestamps
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles                IS 'Perfil público de cada usuario de auth. 1:1 con auth.users.';
COMMENT ON COLUMN public.profiles.id            IS 'PK = auth.users.id';
COMMENT ON COLUMN public.profiles.display_name  IS 'Nombre mostrado en miembros y headers. 1-80 chars.';
COMMENT ON COLUMN public.profiles.avatar_url    IS 'URL externa del avatar (storage propio en v1).';
COMMENT ON COLUMN public.profiles.locale        IS 'BCP-47 locale del usuario. Default es-ES.';

-- -----------------------------------------------------------------------------
-- Trigger: crear profile automáticamente al registrarse en auth.users
-- -----------------------------------------------------------------------------
-- Origen del display_name: parte local del email, capitalizada.
-- Si ya existe un perfil (re-registro), no se sobrescribe.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- corre con privilegios del owner; evita recursion RLS
SET search_path = public
AS $$
DECLARE
  v_display_name text;
BEGIN
  -- Extrae la parte local del email como nombre por defecto.
  -- trim() por si llega con espacios; initcap() capitaliza la primera letra.
  v_display_name := initcap(trim(split_part(NEW.email, '@', 1)));

  -- Limita a 80 chars por el CHECK de la tabla.
  v_display_name := substring(v_display_name from 1 for 80);

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, v_display_name)
  ON CONFLICT (id) DO NOTHING;  -- idempotente

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user()
  IS 'Trigger AFTER INSERT sobre auth.users: crea fila en public.profiles.';

-- El trigger debe existir solo si no existe (idempotencia).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Trigger: updated_at automático
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_set_updated_at()
  IS 'Trigger genérico: setea NEW.updated_at = now() en cada UPDATE.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_profiles_updated_at'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
-- Búsquedas por display_name (case-insensitive). Útil para autocomplete de
-- invitaciones en v1.
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_lower
  ON public.profiles (lower(display_name));

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
-- Política matriz (ver supabase/rls.md):
--   * SELECT: cualquier usuario autenticado puede ver todos los perfiles
--     (necesario para mostrar listas de miembros).
--   * UPDATE: solo el propio.
--   * INSERT: solo el trigger de auth (no se permite desde cliente).
--   * DELETE: bloqueado.
-- Se aplica en 20260601000015_rls_policies.sql — aquí solo dejamos el flag.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE  ROW LEVEL SECURITY;
