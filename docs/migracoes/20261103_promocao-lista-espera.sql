-- Aplicada no Supabase em 03/11/2026.
-- Promoção automática da lista de espera quando uma vaga é liberada.
--
-- A promoção roda dentro de `cancelar_inscricao` (participante) e de
-- `admin_definir_status_inscricao` (painel), então a vaga nunca fica ociosa
-- enquanto houver fila. O trigger `notificar_inscricao` já cria a notificação
-- do sino quando o status muda para `confirmada`.

CREATE OR REPLACE FUNCTION public.promover_lista_espera(p_evento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_limite integer;
  v_confirmados integer;
  v_inscricao_id uuid;
  v_participante_id uuid;
begin
  select limite_vagas into v_limite
  from public.eventos
  where id = p_evento_id;

  if v_limite is null then
    return jsonb_build_object('ok', true, 'promovido', false, 'codigo', 'sem_limite');
  end if;

  select count(*) into v_confirmados
  from public.inscricoes
  where evento_id = p_evento_id
    and status = 'confirmada';

  if v_confirmados >= v_limite then
    return jsonb_build_object('ok', true, 'promovido', false, 'codigo', 'sem_vaga');
  end if;

  select id, participante_id into v_inscricao_id, v_participante_id
  from public.inscricoes
  where evento_id = p_evento_id
    and status = 'lista_espera'
  order by data_inscricao asc, created_at asc
  limit 1
  for update skip locked;

  if v_inscricao_id is null then
    return jsonb_build_object('ok', true, 'promovido', false, 'codigo', 'fila_vazia');
  end if;

  update public.inscricoes
  set status = 'confirmada',
      data_inscricao = now()
  where id = v_inscricao_id;

  return jsonb_build_object(
    'ok', true,
    'promovido', true,
    'inscricao_id', v_inscricao_id,
    'participante_id', v_participante_id
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.promover_lista_espera(uuid) FROM public, anon, authenticated;

-- `cancelar_inscricao` e `admin_definir_status_inscricao` chamam a função acima
-- e devolvem `promovido`/`promovido_inscricao_id` para o app enviar o e-mail.

CREATE OR REPLACE FUNCTION public.contar_lista_espera(p_evento_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  select count(*)::integer
  from public.inscricoes
  where evento_id = p_evento_id
    and status = 'lista_espera';
$function$;

REVOKE ALL ON FUNCTION public.contar_lista_espera(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.contar_lista_espera(uuid) TO anon, authenticated;
