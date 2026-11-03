-- Aplicada no Supabase em 03/11/2026.
-- Bucket público para a arte promocional dos eventos.
--
-- Leitura pública (imagem sem dado pessoal); escrita apenas para admin
-- (`public.eh_admin()`) ou `service_role`. O app sobe pelo Server Action
-- `enviarImagemEvento` com nome gerado no servidor (`<uuid>.<ext>`).

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'eventos',
  'eventos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Imagens de eventos são públicas" ON storage.objects;
CREATE POLICY "Imagens de eventos são públicas"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'eventos');

DROP POLICY IF EXISTS "Admins enviam imagens de eventos" ON storage.objects;
CREATE POLICY "Admins enviam imagens de eventos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'eventos'
  AND public.eh_admin()
);

DROP POLICY IF EXISTS "Admins atualizam imagens de eventos" ON storage.objects;
CREATE POLICY "Admins atualizam imagens de eventos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'eventos'
  AND public.eh_admin()
)
WITH CHECK (
  bucket_id = 'eventos'
  AND public.eh_admin()
);

DROP POLICY IF EXISTS "Admins removem imagens de eventos" ON storage.objects;
CREATE POLICY "Admins removem imagens de eventos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'eventos'
  AND public.eh_admin()
);
