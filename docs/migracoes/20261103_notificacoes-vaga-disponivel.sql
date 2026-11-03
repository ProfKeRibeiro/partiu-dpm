-- Aplicada no Supabase em 03/11/2026 (migração
-- `notificacoes_vaga_disponivel`).
--
-- O convite de vaga (`aguardando_confirmacao`) passou a gerar aviso no sino.
-- A migração seguinte, `ajuste_notificacao_confirmada`, refinou o texto das
-- notificações de inscrição; o corpo abaixo é o estado final real do banco
-- (`pg_get_functiondef('public.notificar_inscricao')` e
-- `notificacoes_tipo_check`).

ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE public.notificacoes
  ADD CONSTRAINT notificacoes_tipo_check
  CHECK (tipo IN (
    'inscricao_confirmada',
    'inscricao_cancelada',
    'lista_espera',
    'vaga_disponivel',
    'presenca_registrada',
    'certificado_emitido',
    'certificado_cancelado'
  ));

CREATE OR REPLACE FUNCTION public.notificar_inscricao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  evento_titulo text;
begin
  select titulo into evento_titulo from public.eventos where id = new.evento_id;

  if tg_op = 'INSERT' then
    if new.status = 'confirmada' then
      insert into public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      values (new.participante_id, 'inscricao_confirmada', 'Inscrição confirmada',
              'Sua inscrição em ' || evento_titulo || ' está confirmada.', '/conta/inscricoes');
    elsif new.status = 'lista_espera' then
      insert into public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      values (new.participante_id, 'lista_espera', 'Você está na lista de espera',
              'Sua inscrição em ' || evento_titulo || ' entrou na lista de espera.', '/conta/inscricoes');
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'confirmada' then
      insert into public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      values (new.participante_id, 'inscricao_confirmada', 'Inscrição confirmada',
              'Sua inscrição em ' || evento_titulo || ' está confirmada.', '/conta/inscricoes');
    elsif new.status = 'lista_espera' then
      insert into public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      values (new.participante_id, 'lista_espera', 'Você está na lista de espera',
              'Sua inscrição em ' || evento_titulo || ' entrou na lista de espera.', '/conta/inscricoes');
    elsif new.status = 'aguardando_confirmacao' then
      insert into public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      values (new.participante_id, 'vaga_disponivel', 'Surgiu uma vaga!',
              'Uma vaga abriu em ' || evento_titulo || '. Confirme sua presença até ' ||
              to_char(new.convite_expira_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || '.',
              '/conta/inscricoes');
    elsif new.status = 'cancelada' then
      insert into public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      values (new.participante_id, 'inscricao_cancelada', 'Inscrição cancelada',
              'Sua inscrição em ' || evento_titulo || ' foi cancelada.', '/conta/inscricoes');
    end if;
  end if;

  return new;
end;
$function$;
