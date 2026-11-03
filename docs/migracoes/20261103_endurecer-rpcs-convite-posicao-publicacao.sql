-- Aplicada no Supabase em 03/11/2026 (migração
-- `endurecer_rpcs_convite_posicao_publicacao`).
--
-- Conteúdo reconstruído a partir do estado real do banco:
-- `pg_get_functiondef` de `posicao_lista_espera` e `proacl` de
-- `posicao_lista_espera`, `responder_convite` e `admin_publicar_evento`.
--
-- O que mudou:
-- 1. `posicao_lista_espera` passou a validar o dono (ou admin) antes de
--    devolver a posição, em vez de aceitar qualquer inscrição.
-- 2. `EXECUTE` revogado de `PUBLIC`/`anon` nas três RPCs. `responder_convite`
--    e `admin_publicar_evento` já validavam o chamador internamente; o grant
--    público apenas expunha a função no PostgREST.

CREATE OR REPLACE FUNCTION public.posicao_lista_espera(p_inscricao_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_evento_id uuid;
  v_data timestamptz;
  v_id uuid;
begin
  select i.evento_id, i.data_inscricao, i.id
    into v_evento_id, v_data, v_id
  from public.inscricoes i
  where i.id = p_inscricao_id;

  if v_evento_id is null then
    return null;
  end if;

  if not (
    public.eh_admin()
    or exists (
      select 1
      from public.inscricoes i
      where i.id = p_inscricao_id
        and i.participante_id = v_uid
    )
  ) then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  return (
    select 1 + count(*)::integer
    from public.inscricoes i
    where i.evento_id = v_evento_id
      and i.status = 'lista_espera'
      and (i.data_inscricao, i.id) < (v_data, v_id)
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.posicao_lista_espera(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.posicao_lista_espera(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.responder_convite(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_convite(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_publicar_evento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_publicar_evento(uuid) TO authenticated;
