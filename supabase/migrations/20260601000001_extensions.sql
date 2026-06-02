-- =============================================================================
-- Migración 1: Extensiones de PostgreSQL
-- =============================================================================
-- Habilita extensiones necesarias para Plantir:
--   * pgcrypto     -> funciones crypto (gen_random_uuid, digest, etc.)
--   * citext       -> comparaciones de email case-insensitive
--   * uuid-ossp    -> generación de UUIDs (respaldo a pgcrypto)
-- =============================================================================

-- pgcrypto: provee gen_random_uuid() y funciones de hash (digest, hmac).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- citext: tipo de texto case-insensitive, usado en columnas email.
CREATE EXTENSION IF NOT EXISTS citext;

-- uuid-ossp: generadores UUID alternativos (uuid_generate_v4).
-- Mantenido como respaldo en caso de reinstalación o migración cross-cloud.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
