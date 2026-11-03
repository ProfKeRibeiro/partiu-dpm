-- Aplicada no Supabase em 03/11/2026.
-- Blindagem de convites, corrida de vagas e registro de avisos.
--
-- ORDEM: aplicar depois de `20261103_lista-espera-e-dedupe-avisos.sql` e de
-- `20261103_convites-sem-bloqueio.sql`, porque esta migração redefine
-- `inscrever_em_evento` e `registrar_aviso_email`. A redefinição de
-- `convocar_lista_espera` (guarda de status/início/fim + trava por evento) foi
-- consolidada em `20261103_convites-sem-bloqueio.sql`, que é a versão vigente.
--
-- 1. Índice único parcial: no máximo um convite pendente por evento.
-- 2. `responder_convite` recusa aceite depois do início do evento.
-- 3. `registrar_aviso_email` só aceita o dono da inscrição, admin ou a chave
--    `service_role` (antes qualquer `authenticated` podia gravar/suprimir aviso
--    de qualquer inscrição).
-- 4. `inscrever_em_evento` entra na mesma trava por evento usada por
--    `convocar_lista_espera`, evitando vaga ocupada entre contagem e convite.

-- 1. No máximo um convite pendente por evento --------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS convocacoes_uma_pendente_por_evento
  ON public.convocacoes (evento_id)
  WHERE resultado = 'pendente';

-- 2. Aceite de convite bloqueado depois do início do evento -------------------

CREATE OR REPLACE FUNCTION public.responder_convite(p_inscricao_id uuid, p_aceitar boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_inscricao public.inscricoes%rowtype;
  v_evento_status text;
  v_evento_inicio timestamptz;
  v_evento_fim timestamptz;
  v_proximo jsonb;
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

  if v_inscricao.participante_id <> v_uid then
    return jsonb_build_object('ok', false, 'codigo', 'nao_encontrado');
  end if;

  if v_inscricao.status <> 'aguardando_confirmacao' then
    return jsonb_build_object('ok', false, 'codigo', 'sem_convite');
  end if;

  if v_inscricao.convite_expira_em is not null
     and v_inscricao.convite_expira_em < now() then
    return jsonb_build_object('ok', false, 'codigo', 'convite_expirado');
  end if;

  select status, data_inicio, data_fim
    into v_evento_status, v_evento_inicio, v_evento_fim
  from public.eventos
  where id = v_inscricao.evento_id;

  if p_aceitar
     and (
       v_evento_status is distinct from 'publicado'
       or (v_evento_inicio is not null and now() >= v_evento_inicio)
       or (v_evento_fim is not null and now() > v_evento_fim)
     ) then
    return jsonb_build_object('ok', false, 'codigo', 'evento_encerrado');
  end if;

  if p_aceitar then
    update public.inscricoes
    set status = 'confirmada',
        data_inscricao = now(),
        convite_expira_em = null
    where id = v_inscricao.id;

    update public.convocacoes
    set resultado = 'confirmado',
        respondido_em = now()
    where inscricao_id = v_inscricao.id
      and resultado = 'pendente';

    return jsonb_build_object('ok', true, 'codigo', 'confirmado');
  end if;

  update public.inscricoes
  set status = 'cancelada',
      convite_expira_em = null
  where id = v_inscricao.id;

  update public.convocacoes
  set resultado = 'recusado',
      respondido_em = now()
  where inscricao_id = v_inscricao.id
    and resultado = 'pendente';

  v_proximo := public.convocar_lista_espera(v_inscricao.evento_id);

  return jsonb_build_object(
    'ok', true,
    'codigo', 'recusado',
    'proximo', v_proximo
  );
end;
$function$;

-- 3. Registro de aviso só para dono, admin ou service_role --------------------

CREATE OR REPLACE FUNCTION public.registrar_aviso_email(
  p_inscricao_id uuid,
  p_tipo text,
  p_janela_segundos integer DEFAULT 300
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_autorizado boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if not v_autorizado then
    select exists (
      select 1
      from public.inscricoes i
      where i.id = p_inscricao_id
        and (
          i.participante_id = (select auth.uid())
          or public.eh_admin()
        )
    ) into v_autorizado;
  end if;

  if not v_autorizado then
    return false;
  end if;

  if exists (
    select 1
    from public.avisos_email
    where inscricao_id = p_inscricao_id
      and tipo = p_tipo
      and enviado_em > now() - make_interval(secs => greatest(p_janela_segundos, 0))
  ) then
    return false;
  end if;

  insert into public.avisos_email (inscricao_id, tipo)
  values (p_inscricao_id, p_tipo);

  return true;
end;
$function$;

-- 4. `inscrever_em_evento` na mesma trava por evento --------------------------

CREATE OR REPLACE FUNCTION public.inscrever_em_evento(p_evento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_evento public.eventos%rowtype;
  v_participante public.participantes%rowtype;
  v_inscricao public.inscricoes%rowtype;
  v_total integer;
  v_inscricao_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'nao_autenticado');
  end if;

  select * into v_participante from public.participantes where id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'perfil_nao_encontrado');
  end if;

  select * into v_evento from public.eventos where id = p_evento_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'evento_nao_encontrado');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_evento_id::text, 0));

  if v_evento.status <> 'publicado' then
    return jsonb_build_object('ok', false, 'codigo', 'evento_indisponivel');
  end if;

  if now() > v_evento.data_fim then
    return jsonb_build_object('ok', false, 'codigo', 'evento_encerrado');
  end if;

  if v_evento.inicio_inscricoes is not null and now() < v_evento.inicio_inscricoes then
    return jsonb_build_object('ok', false, 'codigo', 'inscricoes_em_breve');
  end if;

  if now() > coalesce(v_evento.fim_inscricoes, v_evento.data_inicio) then
    return jsonb_build_object('ok', false, 'codigo', 'inscricoes_encerradas');
  end if;

  if v_evento.publico_alvo = 'escola'
     and v_participante.categoria not in ('aluno', 'servidor') then
    return jsonb_build_object('ok', false, 'codigo', 'publico_incompativel');
  end if;

  if v_evento.publico_alvo = 'externo' and v_participante.categoria <> 'externo' then
    return jsonb_build_object('ok', false, 'codigo', 'publico_incompativel');
  end if;

  if cardinality(v_evento.cursos_permitidos) > 0
     and (v_participante.curso is null
          or not (v_participante.curso = any (v_evento.cursos_permitidos))) then
    return jsonb_build_object('ok', false, 'codigo', 'curso_incompativel');
  end if;

  if cardinality(v_evento.series_permitidas) > 0
     and (v_participante.ano_serie is null
          or not (v_participante.ano_serie = any (v_evento.series_permitidas))) then
    return jsonb_build_object('ok', false, 'codigo', 'serie_incompativel');
  end if;

  select * into v_inscricao
  from public.inscricoes
  where evento_id = p_evento_id and participante_id = v_uid;

  if v_inscricao.id is not null then
    if v_inscricao.status = 'confirmada' then
      return jsonb_build_object('ok', false, 'codigo', 'duplicado');
    elsif v_inscricao.status = 'aguardando_confirmacao' then
      return jsonb_build_object('ok', false, 'codigo', 'convite_pendente');
    elsif v_inscricao.status = 'lista_espera' then
      return jsonb_build_object('ok', false, 'codigo', 'lista_espera');
    end if;
  end if;

  if v_evento.limite_vagas is not null then
    select count(*) into v_total
    from public.inscricoes
    where evento_id = p_evento_id
      and status in ('confirmada', 'aguardando_confirmacao');

    if v_total >= v_evento.limite_vagas then
      if v_inscricao.id is not null and v_inscricao.status = 'cancelada' then
        update public.inscricoes
        set status = 'lista_espera', data_inscricao = now()
        where id = v_inscricao.id
        returning id into v_inscricao_id;
      else
        insert into public.inscricoes (evento_id, participante_id, status)
        values (p_evento_id, v_uid, 'lista_espera')
        returning id into v_inscricao_id;
      end if;

      return jsonb_build_object('ok', true, 'codigo', 'lista_espera', 'inscricao_id', v_inscricao_id);
    end if;
  end if;

  if v_inscricao.id is not null and v_inscricao.status = 'cancelada' then
    update public.inscricoes
    set status = 'confirmada', data_inscricao = now()
    where id = v_inscricao.id
    returning id into v_inscricao_id;
  else
    insert into public.inscricoes (evento_id, participante_id, status)
    values (p_evento_id, v_uid, 'confirmada')
    returning id into v_inscricao_id;
  end if;

  return jsonb_build_object('ok', true, 'codigo', 'inscrito', 'inscricao_id', v_inscricao_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'codigo', 'duplicado');
end;
$function$;
