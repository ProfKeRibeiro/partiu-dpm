-- Aplicada no Supabase em 03/11/2026.
-- Novo papel "organizador": autenticado com e-mail @cps.sp.gov.br (domínio
-- exato, o que exclui @aluno.cps.sp.gov.br). Admin continua podendo tudo.
--
-- Regras no banco:
-- 1. `pode_organizar()` reconhece admin ou e-mail institucional.
-- 2. `pode_gerenciar_evento(id)` reconhece admin ou o criador do evento.
-- 3. Policies de `eventos` limitam leitura de rascunho ao dono e escrita ao
--    dono (INSERT exige `criado_por = auth.uid()`).
-- 4. Trigger impede troca de `criado_por` por quem não é admin.
-- 5. RPCs ligadas a um evento trocam `eh_admin()` por
--    `pode_gerenciar_evento(evento)`; as puramente administrativas seguem
--    exigindo admin.

CREATE OR REPLACE FUNCTION public.pode_organizar()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.eh_admin() or exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and split_part(lower(u.email), '@', 2) = 'cps.sp.gov.br'
  );
$function$;

REVOKE ALL ON FUNCTION public.pode_organizar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_organizar() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pode_gerenciar_evento(p_evento_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.eh_admin() or exists (
    select 1
    from public.eventos e
    where e.id = p_evento_id
      and e.criado_por = (select auth.uid())
  );
$function$;

REVOKE ALL ON FUNCTION public.pode_gerenciar_evento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerenciar_evento(uuid) TO authenticated, service_role;

-- Policies de eventos ---------------------------------------------------------

DROP POLICY IF EXISTS "Administradores gerenciam eventos" ON public.eventos;
DROP POLICY IF EXISTS "Eventos publicados ou admin" ON public.eventos;

DROP POLICY IF EXISTS "Eventos visíveis para o dono ou admin" ON public.eventos;
CREATE POLICY "Eventos visíveis para o dono ou admin"
  ON public.eventos
  FOR SELECT
  TO authenticated
  USING (
    status = 'publicado'
    OR public.eh_admin()
    OR criado_por = (select auth.uid())
  );

DROP POLICY IF EXISTS "Organizadores criam eventos" ON public.eventos;
CREATE POLICY "Organizadores criam eventos"
  ON public.eventos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.pode_organizar()
    AND criado_por = (select auth.uid())
  );

DROP POLICY IF EXISTS "Donos gerenciam eventos" ON public.eventos;
CREATE POLICY "Donos gerenciam eventos"
  ON public.eventos
  FOR UPDATE
  TO authenticated
  USING (public.pode_gerenciar_evento(id))
  WITH CHECK (
    public.pode_gerenciar_evento(id)
    AND (
      criado_por = (select auth.uid())
      OR public.eh_admin()
    )
  );

DROP POLICY IF EXISTS "Donos excluem eventos" ON public.eventos;
CREATE POLICY "Donos excluem eventos"
  ON public.eventos
  FOR DELETE
  TO authenticated
  USING (public.pode_gerenciar_evento(id));

-- Integridade de criado_por ---------------------------------------------------

CREATE OR REPLACE FUNCTION public.impedir_troca_criado_por_evento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.criado_por is distinct from new.criado_por
     and not public.eh_admin() then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.impedir_troca_criado_por_evento() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS impedir_troca_criado_por_evento ON public.eventos;
CREATE TRIGGER impedir_troca_criado_por_evento
  BEFORE UPDATE OF criado_por ON public.eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.impedir_troca_criado_por_evento();

-- RPCs ligadas a um evento ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_publicar_evento(p_evento_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  evento public.eventos%ROWTYPE;
BEGIN
  IF NOT public.pode_gerenciar_evento(p_evento_id) THEN
    RAISE EXCEPTION 'nao_autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO evento FROM public.eventos WHERE id = p_evento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'evento_nao_encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF evento.modalidade <> 'presencial' AND coalesce(trim(evento.link_evento), '') = '' THEN
    RAISE EXCEPTION 'link_evento_obrigatorio' USING ERRCODE = '23514';
  END IF;

  UPDATE public.eventos SET status = 'publicado' WHERE id = p_evento_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_obter_evento(p_evento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  resultado jsonb;
BEGIN
  IF NOT public.pode_gerenciar_evento(p_evento_id) THEN
    RAISE EXCEPTION 'nao_autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(evento) INTO resultado
  FROM public.eventos AS evento
  WHERE evento.id = p_evento_id;

  RETURN resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_listar_inscricoes(p_evento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
begin
  if not public.pode_gerenciar_evento(p_evento_id) then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by item->>'nome_completo'), '[]'::jsonb)
  into v_resultado
  from (
    select jsonb_build_object(
      'inscricao_id', i.id,
      'participante_id', i.participante_id,
      'nome_completo', p.nome_completo,
      'email', u.email,
      'categoria', p.categoria,
      'curso', p.curso,
      'ano_serie', p.ano_serie,
      'instituicao', p.instituicao,
      'status', i.status,
      'data_inscricao', i.data_inscricao,
      'presente', coalesce(pr.presente, false),
      'data_presenca', pr.data_registro,
      'certificado_status', c.status,
      'certificado_codigo', c.codigo_validacao,
      'certificado_data', c.data_emissao
    ) as item
    from public.inscricoes i
    join public.participantes p on p.id = i.participante_id
    left join auth.users u on u.id = i.participante_id
    left join public.presencas pr on pr.inscricao_id = i.id
    left join public.certificados c on c.inscricao_id = i.id
    where i.evento_id = p_evento_id
  ) sub;

  return v_resultado;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_definir_presenca(p_inscricao_id uuid, p_presente boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_inscricao public.inscricoes%rowtype;
begin
  select * into v_inscricao
  from public.inscricoes
  where id = p_inscricao_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'nao_encontrado');
  end if;

  if not public.pode_gerenciar_evento(v_inscricao.evento_id) then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  if p_presente and v_inscricao.status <> 'confirmada' then
    return jsonb_build_object('ok', false, 'codigo', 'inscricao_nao_confirmada');
  end if;

  insert into public.presencas (
    inscricao_id, presente, data_registro, registrado_por
  ) values (
    p_inscricao_id,
    p_presente,
    case when p_presente then now() else null end,
    auth.uid()
  )
  on conflict (inscricao_id) do update
  set presente = excluded.presente,
      data_registro = excluded.data_registro,
      registrado_por = excluded.registrado_por;

  return jsonb_build_object('ok', true, 'presente', p_presente);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_emitir_certificado(p_inscricao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_inscricao public.inscricoes%rowtype;
  v_presente boolean;
  v_certificado public.certificados%rowtype;
begin
  select * into v_inscricao
  from public.inscricoes
  where id = p_inscricao_id;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'nao_encontrado');
  end if;

  if not public.pode_gerenciar_evento(v_inscricao.evento_id) then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  if v_inscricao.status <> 'confirmada' then
    return jsonb_build_object('ok', false, 'codigo', 'inscricao_nao_confirmada');
  end if;

  select presente into v_presente
  from public.presencas
  where inscricao_id = p_inscricao_id;

  if coalesce(v_presente, false) is not true then
    return jsonb_build_object('ok', false, 'codigo', 'presenca_nao_registrada');
  end if;

  select * into v_certificado
  from public.certificados
  where inscricao_id = p_inscricao_id;

  if found then
    if v_certificado.status = 'emitido' then
      return jsonb_build_object(
        'ok', true,
        'codigo', 'ja_emitido',
        'codigo_validacao', v_certificado.codigo_validacao
      );
    end if;

    update public.certificados
    set status = 'emitido',
        data_emissao = now(),
        criado_por = auth.uid()
    where id = v_certificado.id
    returning * into v_certificado;

    return jsonb_build_object(
      'ok', true,
      'codigo', 'reemitido',
      'codigo_validacao', v_certificado.codigo_validacao
    );
  end if;

  insert into public.certificados (inscricao_id, status, criado_por)
  values (p_inscricao_id, 'emitido', auth.uid())
  returning * into v_certificado;

  return jsonb_build_object(
    'ok', true,
    'codigo', 'emitido',
    'codigo_validacao', v_certificado.codigo_validacao
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_cancelar_certificado(p_inscricao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_certificado public.certificados%rowtype;
  v_evento_id uuid;
begin
  select * into v_certificado
  from public.certificados
  where inscricao_id = p_inscricao_id;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'nao_encontrado');
  end if;

  select evento_id into v_evento_id
  from public.inscricoes
  where id = p_inscricao_id;

  if not public.pode_gerenciar_evento(v_evento_id) then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  update public.certificados
  set status = 'cancelado'
  where id = v_certificado.id;

  return jsonb_build_object('ok', true, 'codigo', 'cancelado');
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_definir_status_inscricao(p_inscricao_id uuid, p_status text)
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
  if p_status not in ('confirmada', 'cancelada', 'lista_espera') then
    return jsonb_build_object('ok', false, 'codigo', 'status_invalido');
  end if;

  select status, evento_id into v_status_anterior, v_evento_id
  from public.inscricoes
  where id = p_inscricao_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'nao_encontrado');
  end if;

  if not public.pode_gerenciar_evento(v_evento_id) then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  update public.inscricoes
  set status = p_status,
      convite_expira_em = null
  where id = p_inscricao_id;

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

-- Mantém os grants que o app já usa (as funções recriadas herdam o dono, mas os
-- grants não são herdados por CREATE OR REPLACE quando a assinatura muda de
-- corpo; reaplicar é idempotente).
REVOKE ALL ON FUNCTION public.admin_publicar_evento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_publicar_evento(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_obter_evento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_obter_evento(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_listar_inscricoes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_inscricoes(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_definir_presenca(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_definir_presenca(uuid, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_emitir_certificado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_emitir_certificado(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_cancelar_certificado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cancelar_certificado(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_definir_status_inscricao(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_definir_status_inscricao(uuid, text) TO authenticated, service_role;
