-- Aplicada no Supabase em 03/11/2026.
-- Convite de vaga com prazo de confirmação e histórico de convocações.
--
-- Fluxo: quando uma vaga abre, a próxima pessoa da lista recebe um convite com
-- prazo (24h, ou 6h se o evento estiver a menos de 48h). Aceitar confirma a
-- inscrição; recusar ou deixar expirar libera a vaga para a próxima da fila.
-- Tudo é registrado em `public.convocacoes` para o histórico do painel.

ALTER TABLE public.inscricoes DROP CONSTRAINT IF EXISTS inscricoes_status_check;
ALTER TABLE public.inscricoes
  ADD CONSTRAINT inscricoes_status_check
  CHECK (status IN ('confirmada', 'cancelada', 'lista_espera', 'aguardando_confirmacao'));

ALTER TABLE public.inscricoes
  ADD COLUMN IF NOT EXISTS convite_expira_em timestamptz;

CREATE TABLE IF NOT EXISTS public.convocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  inscricao_id uuid NOT NULL REFERENCES public.inscricoes(id) ON DELETE CASCADE,
  participante_id uuid NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  convocado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  respondido_em timestamptz,
  resultado text NOT NULL DEFAULT 'pendente'
    CHECK (resultado IN ('pendente', 'confirmado', 'recusado', 'expirado')),
  email_enviado_em timestamptz
);

ALTER TABLE public.convocacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.convocacoes FROM anon, authenticated;
GRANT SELECT ON TABLE public.convocacoes TO authenticated;

CREATE POLICY "Participante ve suas convocacoes"
  ON public.convocacoes FOR SELECT TO authenticated
  USING (participante_id = (SELECT auth.uid()) OR public.eh_admin());

-- Funções aplicadas:
--   convocar_lista_espera(evento_id)  -> cria o convite (status aguardando_confirmacao)
--   responder_convite(inscricao_id, aceitar) -> confirma/recusa e convoca o próximo
--   expirar_convites()                -> expira vencidos e convoca o próximo
--   posicao_lista_espera(inscricao_id) -> posição do participante na fila
--   contar_lista_espera(evento_id)    -> total na fila (modal de cancelamento)
-- Além disso, `cancelar_inscricao` e `admin_definir_status_inscricao` passaram a
-- chamar `convocar_lista_espera`, e `atualizar_contagem_inscritos` conta como
-- ocupadas as inscrições `confirmada` e `aguardando_confirmacao`.
