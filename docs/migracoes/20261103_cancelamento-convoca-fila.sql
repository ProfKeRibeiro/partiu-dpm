-- Aplicada no Supabase em 03/11/2026 (migração `cancelamento_convoca_fila`).
--
-- `cancelar_inscricao` passou a chamar `convocar_lista_espera`, reservando a
-- vaga para a próxima pessoa da fila e devolvendo `convocado`,
-- `convocado_inscricao_id` e `convite_expira_em` para o app enviar o e-mail.
--
-- Esta é a versão histórica, sem o fechamento do convite pendente. Ela foi
-- substituída por `20261103_convites-sem-bloqueio.sql`, que adiciona
-- `encerrar_convocacao_pendente` antes da convocação — reaplicar este arquivo
-- depois daquele reintroduz o bloqueio da fila.

CREATE OR REPLACE FUNCTION public.cancelar_inscricao(p_inscricao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_inscricao public.inscricoes%rowtype;
  v_evento public.eventos%rowtype;
  v_convite jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'nao_autenticado');
  end if;

  select * into v_inscricao
  from public.inscricoes
  where id = p_inscricao_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'nao_encontrado');
  end if;

  if v_inscricao.participante_id <> v_uid and not public.eh_admin() then
    return jsonb_build_object('ok', false, 'codigo', 'nao_encontrado');
  end if;

  if v_inscricao.status = 'cancelada' then
    return jsonb_build_object('ok', true, 'codigo', 'ja_cancelada');
  end if;

  select * into v_evento from public.eventos where id = v_inscricao.evento_id;

  if found and now() > v_evento.data_inicio then
    return jsonb_build_object('ok', false, 'codigo', 'cancelamento_encerrado');
  end if;

  update public.inscricoes
  set status = 'cancelada',
      convite_expira_em = null
  where id = v_inscricao.id;

  v_convite := public.convocar_lista_espera(v_inscricao.evento_id);

  return jsonb_build_object(
    'ok', true,
    'codigo', 'cancelada',
    'convocado', coalesce((v_convite->>'convocado')::boolean, false),
    'convocado_inscricao_id', v_convite->>'inscricao_id',
    'convite_expira_em', v_convite->>'expira_em'
  );
end;
$function$;
