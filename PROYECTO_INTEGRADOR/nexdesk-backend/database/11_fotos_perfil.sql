-- NEXDESK | Foto de perfil por usuario
-- Ejecutar una vez en instalaciones existentes y también en instalaciones nuevas.

BEGIN;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'fotos-perfil',
  'fotos-perfil',
  TRUE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
