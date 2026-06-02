-- =============================================================================
-- Migración 16: Storage Policies
-- =============================================================================
-- Buckets:
--   * avatars           -> avatars/{user_id}/...   (RLS: self)
--   * trip-covers       -> trip-covers/{trip_id}/... (RLS: admin)
--   * proposal-images   -> proposal-images/{poll_id}/... (RLS: trip members)
--   * receipts          -> receipts/{trip_id}/{expense_id}/... (RLS: trip members)
--
-- Límite duro: 5MB por archivo. Mime types: image/jpeg, image/png,
-- image/webp, image/gif.
--
-- Los buckets se crean con `storage.create_bucket` (función privileged
-- disponible solo en Supabase). En local con `supabase start` esta función
-- existe; en producción se gestiona desde Dashboard / CLI.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Crear buckets (idempotente)
-- -----------------------------------------------------------------------------
-- Se crean como PRIVATE (public=false). El acceso es siempre vía URL firmada
-- emitida por Edge Function con RLS, NUNCA pública.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  -- avatars
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    PERFORM storage.create_bucket(
      id          => 'avatars',
      name        => 'avatars',
      public      => false,
      file_size_limit => 5 * 1024 * 1024,  -- 5 MB
      allowed_mime_types => ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
  END IF;

  -- trip-covers
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'trip-covers') THEN
    PERFORM storage.create_bucket(
      id          => 'trip-covers',
      name        => 'trip-covers',
      public      => false,
      file_size_limit => 5 * 1024 * 1024,
      allowed_mime_types => ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
  END IF;

  -- proposal-images
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'proposal-images') THEN
    PERFORM storage.create_bucket(
      id          => 'proposal-images',
      name        => 'proposal-images',
      public      => false,
      file_size_limit => 5 * 1024 * 1024,
      allowed_mime_types => ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
  END IF;

  -- receipts
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'receipts') THEN
    PERFORM storage.create_bucket(
      id          => 'receipts',
      name        => 'receipts',
      public      => false,
      file_size_limit => 5 * 1024 * 1024,
      allowed_mime_types => ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- RLS en storage.objects
-- -----------------------------------------------------------------------------
-- Supabase ya tiene RLS habilitado en storage.objects por defecto. Aquí
-- añadimos las policies para nuestros 4 buckets. La convención de path
-- es siempre: <bucket>/<entity_id>/<filename>
-- -----------------------------------------------------------------------------

-- Limpiar policies previas (idempotencia)
DROP POLICY IF EXISTS "avatars_owner_rw"            ON storage.objects;
DROP POLICY IF EXISTS "trip_covers_admin_rw"        ON storage.objects;
DROP POLICY IF EXISTS "proposal_images_members_rw"  ON storage.objects;
DROP POLICY IF EXISTS "receipts_members_rw"         ON storage.objects;

-- Helper implícito: el primer segmento del path es la entity_id.
-- storage.foldername(name) devuelve text[] con los segmentos.

-- -----------------------------------------------------------------------------
-- avatars: solo el propio user (id en el primer segmento del path).
--   Path convention: avatars/{user_id}/<filename>
-- -----------------------------------------------------------------------------
CREATE POLICY "avatars_owner_rw"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- trip-covers: solo organizer del trip (trip_id en el primer segmento).
--   Path convention: trip-covers/{trip_id}/<filename>
-- -----------------------------------------------------------------------------
CREATE POLICY "trip_covers_admin_rw"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'trip-covers'
    AND public.is_trip_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'trip-covers'
    AND public.is_trip_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- -----------------------------------------------------------------------------
-- proposal-images: miembros del trip del poll (poll_id en el primer segmento).
--   Path convention: proposal-images/{poll_id}/<filename>
--   Lectura: cualquier miembro del trip del poll.
--   Escritura: solo el creator de la propuesta O el admin del trip.
-- -----------------------------------------------------------------------------
CREATE POLICY "proposal_images_members_rw"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'proposal-images'
    AND public.is_trip_member_from_poll(((storage.foldername(name))[1])::uuid, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'proposal-images'
    AND public.is_trip_member_from_poll(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- -----------------------------------------------------------------------------
-- receipts: miembros del trip (trip_id en el primer segmento).
--   Path convention: receipts/{trip_id}/{expense_id}/<filename>
-- -----------------------------------------------------------------------------
CREATE POLICY "receipts_members_rw"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.is_trip_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND public.is_trip_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );
