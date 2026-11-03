-- Aplicada no Supabase em 03/11/2026.
-- A página do evento no painel mostra o histórico de convocações. O organizador
-- precisa ler as convocações dos eventos que criou, não só as próprias.

DROP POLICY IF EXISTS "Participante ve suas convocacoes" ON public.convocacoes;
DROP POLICY IF EXISTS "Participante ou organizador ve convocacoes" ON public.convocacoes;

CREATE POLICY "Participante ou organizador ve convocacoes"
  ON public.convocacoes
  FOR SELECT
  TO authenticated
  USING (
    participante_id = (SELECT auth.uid())
    OR public.eh_admin()
    OR public.pode_gerenciar_evento(evento_id)
  );
