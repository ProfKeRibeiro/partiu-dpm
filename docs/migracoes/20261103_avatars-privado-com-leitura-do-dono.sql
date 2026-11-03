-- Aplicada no Supabase em 03/11/2026 (migração
-- `avatars_privado_com_leitura_do_dono`).
--
-- O bucket nasceu público em `20261029_avatar_participante.sql`. Aqui ele passa
-- a ser privado e a leitura fica restrita ao dono da pasta (ou admin), que o
-- app acessa por URL assinada de 2 horas.
--
-- Conteúdo reconstruído de `storage.buckets` e `pg_policies` (schema storage).

UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'avatars';

DROP POLICY IF EXISTS "Participantes leem a própria foto" ON storage.objects;
CREATE POLICY "Participantes leem a própria foto"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.eh_admin()
  )
);
