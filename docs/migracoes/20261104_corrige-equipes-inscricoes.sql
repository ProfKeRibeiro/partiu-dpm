-- Aplicada no Supabase em 04/11/2026.
-- Correção de integridade das inscrições vinculadas a equipes.
--
-- Bugs corrigidos:
-- 1. Remover/sair deixava a inscrição confirmada e com equipe_id antigo.
-- 2. Cancelar a equipe cancelava só a inscrição do líder (cancelar_inscricao
--    exige dono/admin), mantendo as demais.
-- 3. Entrar em outra equipe não trocava o equipe_id (só atualizava quando nulo).
--
-- Agora a remoção/cancelamento altera a inscrição diretamente (SECURITY
-- DEFINER), zera equipe_id, libera a vaga e chama convocar_lista_espera uma vez.

CREATE OR REPLACE FUNCTION public.garantir_inscricao_equipe(
  p_evento_id uuid,
  p_equipe_id uuid
)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
  v_codigo text;
  v_inscricao_id uuid;
begin
  v_resultado := public.inscrever_em_evento(p_evento_id);
  v_codigo := coalesce(v_resultado->>'codigo', 'erro');

  if coalesce((v_resultado->>'ok')::boolean, false) is false
     and v_codigo not in ('duplicado', 'lista_espera', 'convite_pendente') then
    return v_codigo;
  end if;

  v_inscricao_id := (v_resultado->>'inscricao_id')::uuid;

  if v_inscricao_id is null then
    select i.id into v_inscricao_id
    from public.inscricoes i
    where i.evento_id = p_evento_id
      and i.participante_id = (select auth.uid());
  end if;

  if v_inscricao_id is null then
    return 'inscricao_indisponivel';
  end if;

  -- O participante não pode estar em outra equipe ativa do mesmo evento.
  if exists (
    select 1
    from public.equipe_membros m
    join public.equipes e on e.id = m.equipe_id
    where m.evento_id = p_evento_id
      and m.participante_id = (select auth.uid())
      and m.equipe_id <> p_equipe_id
      and e.status <> 'cancelada'
  ) then
    return 'ja_em_equipe';
  end if;

  -- Sempre aponta para a equipe atual, inclusive ao trocar de equipe.
  update public.inscricoes
  set equipe_id = p_equipe_id
  where id = v_inscricao_id;

  return 'ok';
end;
$function$;

REVOKE ALL ON FUNCTION public.garantir_inscricao_equipe(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.garantir_inscricao_equipe(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sair_equipe(p_equipe_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_equipe public.equipes%rowtype;
  v_membro public.equipe_membros%rowtype;
  v_status text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select * into v_equipe from public.equipes where id = p_equipe_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_nao_encontrada');
  end if;

  select * into v_membro
  from public.equipe_membros
  where equipe_id = p_equipe_id and participante_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_e_membro');
  end if;

  if v_membro.papel = 'lider' then
    return jsonb_build_object('ok', false, 'motivo', 'lider_transferir_ou_cancelar');
  end if;

  if not public.inscricoes_do_evento_abertas(v_equipe.evento_id) then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  update public.inscricoes
  set status = 'cancelada',
      equipe_id = null,
      convite_expira_em = null
  where evento_id = v_equipe.evento_id
    and participante_id = v_uid;

  delete from public.equipe_membros where id = v_membro.id;

  v_status := public.recalcular_status_equipe(p_equipe_id);
  perform public.convocar_lista_espera(v_equipe.evento_id);

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$function$;

REVOKE ALL ON FUNCTION public.sair_equipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sair_equipe(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.remover_membro_equipe(
  p_equipe_id uuid,
  p_participante_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_equipe public.equipes%rowtype;
  v_membro public.equipe_membros%rowtype;
  v_status text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select * into v_equipe from public.equipes where id = p_equipe_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_nao_encontrada');
  end if;

  if v_equipe.lider_id <> v_uid then
    return jsonb_build_object('ok', false, 'motivo', 'apenas_lider');
  end if;

  if p_participante_id = v_uid then
    return jsonb_build_object('ok', false, 'motivo', 'lider_transferir_ou_cancelar');
  end if;

  if not public.inscricoes_do_evento_abertas(v_equipe.evento_id) then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  select * into v_membro
  from public.equipe_membros
  where equipe_id = p_equipe_id and participante_id = p_participante_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_e_membro');
  end if;

  update public.inscricoes
  set status = 'cancelada',
      equipe_id = null,
      convite_expira_em = null
  where evento_id = v_equipe.evento_id
    and participante_id = p_participante_id;

  delete from public.equipe_membros where id = v_membro.id;

  v_status := public.recalcular_status_equipe(p_equipe_id);
  perform public.convocar_lista_espera(v_equipe.evento_id);

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$function$;

REVOKE ALL ON FUNCTION public.remover_membro_equipe(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remover_membro_equipe(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancelar_equipe(p_equipe_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_equipe public.equipes%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select * into v_equipe from public.equipes where id = p_equipe_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_nao_encontrada');
  end if;

  if v_equipe.lider_id <> v_uid and not public.eh_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'apenas_lider');
  end if;

  if v_equipe.status = 'cancelada' then
    return jsonb_build_object('ok', true, 'status', 'cancelada');
  end if;

  if not public.inscricoes_do_evento_abertas(v_equipe.evento_id)
     and not public.eh_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  -- Cancela a inscrição de TODOS os membros (inclusive as com equipe_id
  -- antigo/nulo) e libera as vagas.
  update public.inscricoes i
  set status = 'cancelada',
      equipe_id = null,
      convite_expira_em = null
  where i.evento_id = v_equipe.evento_id
    and (
      i.equipe_id = p_equipe_id
      or i.participante_id in (
        select m.participante_id
        from public.equipe_membros m
        where m.equipe_id = p_equipe_id
      )
    );

  delete from public.equipe_membros where equipe_id = p_equipe_id;

  update public.equipes
  set status = 'cancelada',
      confirmada_em = null
  where id = p_equipe_id;

  perform public.convocar_lista_espera(v_equipe.evento_id);

  return jsonb_build_object('ok', true, 'status', 'cancelada');
end;
$function$;

REVOKE ALL ON FUNCTION public.cancelar_equipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_equipe(uuid) TO authenticated, service_role;
