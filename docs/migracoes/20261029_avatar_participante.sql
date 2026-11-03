-- Aplicada no Supabase em 29/10/2026.
--
-- ESTADO FINAL: o bucket `avatars` é PRIVADO. A leitura é feita por URL
-- assinada de 2 horas, com `SELECT` restrito ao dono da pasta (ou admin). Esta
-- versão do arquivo foi corrigida para refletir o estado atual, conforme a
-- migração `20261103_avatars_privado_com_leitura_do_dono.sql`; a versão
-- original criava o bucket como público. Não volte `public` para `true`.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'avatars',
  'avatars',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Participantes enviam a própria foto" ON storage.objects;
CREATE POLICY "Participantes enviam a própria foto"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

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

DROP POLICY IF EXISTS "Participantes removem a própria foto" ON storage.objects;
CREATE POLICY "Participantes removem a própria foto"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
