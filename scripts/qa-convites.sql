-- Teste de contrato dos convites da lista de espera.
--
-- Roda em uma única instrução: se qualquer asserção falhar, a instrução inteira
-- é revertida e nenhum dado de teste fica no banco. No fim, os eventos
-- temporários são apagados (cascade em inscrições e convocações).
--
-- Requisitos: pelo menos 2 linhas em `public.participantes`.
-- Execução: MCP do Supabase (`execute_sql`) com o conteúdo deste arquivo.
-- Resultado esperado: nenhuma linha e nenhuma exceção (NOTICE "QA convites OK").

do $qa$
declare
  v_p1 uuid;
  v_p2 uuid;
  v_ev_iniciado uuid := gen_random_uuid();
  v_ev_futuro uuid := gen_random_uuid();
  v_ev_rascunho uuid := gen_random_uuid();
  v_ev_inscricao uuid := gen_random_uuid();
  v_insc_p1 uuid;
  v_res jsonb;
  v_n integer;
  v_aviso boolean;
begin
  select id into v_p1 from public.participantes order by created_at limit 1;
  select id into v_p2 from public.participantes where id <> v_p1 order by created_at limit 1;

  if v_p1 is null or v_p2 is null then
    raise exception 'são necessários 2 participantes para rodar o teste';
  end if;

  insert into public.eventos (id, titulo, tipo, modalidade, data_inicio, data_fim, limite_vagas, status)
  values
    (v_ev_iniciado, 'QA evento iniciado', 'outro', 'presencial', now() - interval '1 hour', now() + interval '2 hours', 1, 'publicado'),
    (v_ev_futuro,   'QA evento futuro',   'outro', 'presencial', now() + interval '3 days', now() + interval '3 days 2 hours', 1, 'publicado'),
    (v_ev_rascunho, 'QA evento rascunho', 'outro', 'presencial', now() + interval '5 days', now() + interval '5 days 2 hours', 1, 'rascunho'),
    (v_ev_inscricao,'QA evento inscricao','outro', 'presencial', now() + interval '7 days', now() + interval '7 days 2 hours', 2, 'publicado');

  -- Evento já iniciado não convoca ninguém
  insert into public.inscricoes (evento_id, participante_id, status)
  values (v_ev_iniciado, v_p1, 'confirmada'), (v_ev_iniciado, v_p2, 'lista_espera');

  v_res := public.convocar_lista_espera(v_ev_iniciado);
  if v_res->>'codigo' <> 'evento_iniciado' then
    raise exception 'esperado evento_iniciado, veio %', v_res;
  end if;

  select count(*) into v_n from public.convocacoes where evento_id = v_ev_iniciado;
  if v_n <> 0 then raise exception 'evento iniciado criou % convites', v_n; end if;

  -- Evento não publicado não convoca
  v_res := public.convocar_lista_espera(v_ev_rascunho);
  if v_res->>'codigo' <> 'evento_indisponivel' then
    raise exception 'esperado evento_indisponivel, veio %', v_res;
  end if;

  -- Evento futuro convoca a primeira pessoa e só aceita um convite pendente
  insert into public.inscricoes (evento_id, participante_id, status)
  values (v_ev_futuro, v_p1, 'lista_espera'), (v_ev_futuro, v_p2, 'lista_espera');

  v_res := public.convocar_lista_espera(v_ev_futuro);
  if (v_res->>'convocado')::boolean is not true then
    raise exception 'esperado convocado true, veio %', v_res;
  end if;

  select id into v_insc_p1 from public.inscricoes
  where evento_id = v_ev_futuro and participante_id = v_p1;

  v_res := public.convocar_lista_espera(v_ev_futuro);
  if v_res->>'codigo' <> 'convite_pendente' then
    raise exception 'esperado convite_pendente, veio %', v_res;
  end if;

  select count(*) into v_n from public.convocacoes
  where evento_id = v_ev_futuro and resultado = 'pendente';
  if v_n <> 1 then raise exception 'esperado 1 convite pendente, veio %', v_n; end if;

  -- Registrar aviso: sem JWT não autoriza
  v_aviso := public.registrar_aviso_email(v_insc_p1, 'teste_qa', 300);
  if v_aviso is true then raise exception 'postgres não deveria autorizar aviso'; end if;

  -- Dono autoriza uma única vez na janela de deduplicação
  perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_p1::text, true);

  v_aviso := public.registrar_aviso_email(v_insc_p1, 'teste_qa', 300);
  if v_aviso is not true then raise exception 'dono deveria autorizar o aviso'; end if;

  v_aviso := public.registrar_aviso_email(v_insc_p1, 'teste_qa', 300);
  if v_aviso is not false then raise exception 'dedupe deveria bloquear o segundo aviso'; end if;

  -- Outro participante não grava aviso da inscrição alheia
  perform set_config('request.jwt.claims', json_build_object('sub', v_p2, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_p2::text, true);

  v_aviso := public.registrar_aviso_email(v_insc_p1, 'outro_tipo_qa', 300);
  if v_aviso is not false then raise exception 'não-dono autorizou aviso'; end if;

  -- Fluxo normal de inscrição continua funcionando
  perform set_config('request.jwt.claims', json_build_object('sub', v_p1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_p1::text, true);

  v_res := public.inscrever_em_evento(v_ev_inscricao);
  if v_res->>'codigo' <> 'inscrito' then
    raise exception 'esperado inscrito, veio %', v_res;
  end if;

  delete from public.avisos_email where inscricao_id = v_insc_p1;
  delete from public.eventos
  where id in (v_ev_iniciado, v_ev_futuro, v_ev_rascunho, v_ev_inscricao);

  raise notice 'QA convites OK';
end;
$qa$;
