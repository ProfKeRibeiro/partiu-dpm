-- Aplicada no Supabase em 03/11/2026.
-- O professor orientador de equipe precisa ter e-mail institucional @cps.sp.gov.br.

ALTER TABLE public.equipes
  DROP CONSTRAINT IF EXISTS equipes_orientador_email_dominio;

ALTER TABLE public.equipes
  ADD CONSTRAINT equipes_orientador_email_dominio
  CHECK (
    orientador_email IS NULL
    OR orientador_email ~* '^[a-z0-9._%+-]+@cps\.sp\.gov\.br$'
  );

COMMENT ON CONSTRAINT equipes_orientador_email_dominio ON public.equipes IS
  'O professor orientador precisa ter e-mail institucional @cps.sp.gov.br.';
