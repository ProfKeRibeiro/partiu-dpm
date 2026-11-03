-- Aplicada no Supabase em 03/11/2026.
-- Corrige o bloqueio permanente da lista de espera.
--
-- Problema: quando a pessoa convocada cancelava a inscrição (pela área do
-- participante) ou o admin mudava o status de `aguardando_confirmacao`, a linha
-- correspondente em `convocacoes` continuava `pendente`. Como
-- `convocar_lista_espera` só convoca quando não existe convite pendente, e
-- `expirar_convites` só resolve convites cuja inscrição ainda está em
-- `aguardando_confirmacao`, aquela linha nunca era fechada: o evento deixava de
-- convocar qualquer pessoa da fila para sempre.
--
-- Correções:
-- 1. `encerrar_convocacao_pendente` fecha o convite pendente de uma inscrição.
-- 2. `cancelar_inscricao` e `admin_definir_status_inscricao` chamam a função ao
--    tirar a inscrição de `aguardando_confirmacao`.
-- 3. `expirar_convites` fecha convites órfãos (inscrição que já saiu de
--    `aguardando_confirmacao`) antes de processar os vencidos.
-- 4. `convocar_lista_espera` só considera pendente o convite de uma inscrição
--    que ainda está em `aguardando_confirmacao` (defesa em profundidade).
-- 5. Remove `promover_lista_espera`, código morto substituído por
--    `convocar_lista_espera` (ver docs/migracoes/20261103_convites-lista-espera.sql).

-- 1. Resultado novo: convite encerrado porque a inscrição saiu da reserva ----

ALTER TABLE public.convocacoes DROP CONSTRAINT IF EXISTS convocacoes_resultado_check;
ALTER TABLE public.convocacoes
  ADD CONSTRAINT convocacoes_resultado_check
  CHECK (resultado IN ('pendente', 'confirmado', 'recusado', 'expirado', 'cancelado'));

CREATE OR REPLACE FUNCTION public.encerrar_convocacao_pendente(
  p_inscricao_id uuid,
  p_resultado text DEFAULT 'cancelado'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
begin
  if p_resultado not in ('cancelado', 'expirado', 'recusado') then
    raise exception 'resultado_invalido' using errcode = '22023';
  end if;

  update public.convocacoes
  set resultado = p_resultado,
      respondido_em = now()
  where inscricao_id = p_inscricao_id
    and resultado = 'pendente';
end;
$function$;

REVOKE ALL ON FUNCTION public.encerrar_convocacao_pendente(uuid, text) FROM PUBLIC, anon, authenticated;

-- 2. Cancelamento do participante ---------------------------------------------

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

  -- Fecha a reserva antes de convocar: sem isso o convite fica pendente para
  -- sempre e a fila do evento trava.
  perform public.encerrar_convocacao_pendente(v_inscricao.id, 'cancelado');

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

-- 3. Mudança de status pelo painel -------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_definir_status_inscricao(
  p_inscricao_id uuid,
  p_status text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_evento_id uuid;
  v_status_anterior text;
  v_convite jsonb;
begin
  if not public.eh_admin() then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  if p_status not in ('confirmada', 'cancelada', 'lista_espera') then
    return jsonb_build_object('ok', false, 'codigo', 'status_invalido');
  end if;

  select status into v_status_anterior
  from public.inscricoes
  where id = p_inscricao_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'nao_encontrado');
  end if;

  update public.inscricoes
  set status = p_status,
      convite_expira_em = null
  where id = p_inscricao_id
  returning evento_id into v_evento_id;

  -- O admin decidiu o destino da vaga: o convite pendente deixa de valer.
  if v_status_anterior = 'aguardando_confirmacao' then
    perform public.encerrar_convocacao_pendente(p_inscricao_id, 'cancelado');
  end if;

  if p_status = 'cancelada' then
    v_convite := public.convocar_lista_espera(v_evento_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'codigo', 'atualizado',
    'status', p_status,
    'convocado', coalesce((v_convite->>'convocado')::boolean, false),
    'convocado_inscricao_id', v_convite->>'inscricao_id',
    'convite_expira_em', v_convite->>'expira_em'
  );
end;
$function$;

-- 4. Expiração: fecha órfãos antes de processar os vencidos -------------------

CREATE OR REPLACE FUNCTION public.expirar_convites()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_registro record;
  v_novos jsonb := '[]'::jsonb;
  v_novo jsonb;
begin
  -- Convites pendentes cuja inscrição já saiu de `aguardando_confirmacao`
  -- (cancelamento, ação do admin, etc.) nunca venceriam: fecham aqui.
  update public.convocacoes c
  set resultado = 'cancelado',
      respondido_em = now()
  from public.inscricoes i
  where i.id = c.inscricao_id
    and c.resultado = 'pendente'
    and i.status <> 'aguardando_confirmacao';

  for v_registro in
    select c.id, c.inscricao_id, c.evento_id
    from public.convocacoes c
    join public.inscricoes i on i.id = c.inscricao_id
    where c.resultado = 'pendente'
      and c.expira_em < now()
      and i.status = 'aguardando_confirmacao'
    for update of c skip locked
  loop
    update public.inscricoes
    set status = 'cancelada',
        convite_expira_em = null
    where id = v_registro.inscricao_id;

    update public.convocacoes
    set resultado = 'expirado',
        respondido_em = now()
    where id = v_registro.id;

    v_novo := public.convocar_lista_espera(v_registro.evento_id);

    if coalesce((v_novo->>'convocado')::boolean, false) then
      v_novos := v_novos || jsonb_build_array(v_novo);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'novos', v_novos);
end;
$function$;

-- 5. Convite pendente só conta enquanto a inscrição ainda está reservada -------

CREATE OR REPLACE FUNCTION public.convocar_lista_espera(p_evento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_limite integer;
  v_inicio timestamptz;
  v_fim timestamptz;
  v_status text;
  v_ocupadas integer;
  v_pendente integer;
  v_inscricao_id uuid;
  v_participante_id uuid;
  v_expira timestamptz;
begin
  select limite_vagas, data_inicio, data_fim, status
    into v_limite, v_inicio, v_fim, v_status
  from public.eventos
  where id = p_evento_id;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'evento_nao_encontrado');
  end if;

  if v_status <> 'publicado' then
    return jsonb_build_object('ok', true, 'convocado', false, 'codigo', 'evento_indisponivel');
  end if;

  if v_inicio is not null and now() >= v_inicio then
    return jsonb_build_object('ok', true, 'convocado', false, 'codigo', 'evento_iniciado');
  end if;

  if v_fim is not null and now() > v_fim then
    return jsonb_build_object('ok', true, 'convocado', false, 'codigo', 'evento_encerrado');
  end if;

  if v_limite is null then
    return jsonb_build_object('ok', true, 'convocado', false, 'codigo', 'sem_limite');
  end if;

  -- Mesma trava de `inscrever_em_evento`: a vaga não é fechada no meio do convite.
  perform pg_advisory_xact_lock(hashtextextended(p_evento_id::text, 0));

  select count(*) into v_pendente
  from public.convocacoes c
  join public.inscricoes i on i.id = c.inscricao_id
  where c.evento_id = p_evento_id
    and c.resultado = 'pendente'
    and i.status = 'aguardando_confirmacao';

  if v_pendente > 0 then
    return jsonb_build_object('ok', true, 'convocado', false, 'codigo', 'convite_pendente');
  end if;

  select count(*) into v_ocupadas
  from public.inscricoes
  where evento_id = p_evento_id
    and status in ('confirmada', 'aguardando_confirmacao');

  if v_ocupadas >= v_limite then
    return jsonb_build_object('ok', true, 'convocado', false, 'codigo', 'sem_vaga');
  end if;

  select id, participante_id into v_inscricao_id, v_participante_id
  from public.inscricoes
  where evento_id = p_evento_id
    and status = 'lista_espera'
  order by data_inscricao asc, created_at asc
  limit 1
  for update skip locked;

  if v_inscricao_id is null then
    return jsonb_build_object('ok', true, 'convocado', false, 'codigo', 'fila_vazia');
  end if;

  v_expira := now() + case
    when v_inicio is not null and v_inicio - now() <= interval '48 hours'
      then interval '6 hours'
    else interval '24 hours'
  end;

  update public.inscricoes
  set status = 'aguardando_confirmacao',
      convite_expira_em = v_expira
  where id = v_inscricao_id;

  begin
    insert into public.convocacoes (evento_id, inscricao_id, participante_id, expira_em)
    values (p_evento_id, v_inscricao_id, v_participante_id, v_expira);
  exception
    when unique_violation then
      update public.inscricoes
      set status = 'lista_espera',
          convite_expira_em = null
      where id = v_inscricao_id;

      return jsonb_build_object('ok', true, 'convocado', false, 'codigo', 'convite_pendente');
  end;

  return jsonb_build_object(
    'ok', true,
    'convocado', true,
    'inscricao_id', v_inscricao_id,
    'participante_id', v_participante_id,
    'expira_em', v_expira
  );
end;
$function$;

-- 6. Código morto: `promover_lista_espera` foi substituída por convites ------

DROP FUNCTION IF EXISTS public.promover_lista_espera(uuid);
