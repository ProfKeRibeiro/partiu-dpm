-- Aplicada no Supabase em 03/11/2026 (migração
-- `registrar_aviso_email_exige_dono`).
--
-- Antes: qualquer usuário autenticado podia chamar a RPC com qualquer
-- `p_inscricao_id` e gravar ou suprimir avisos de outra pessoa.
-- Depois: exige ser o dono da inscrição, admin ou a chave `service_role`.
--
-- ATENÇÃO: esta é a versão booleana (histórica). A migração
-- `20261103_dedupe-aviso-por-id.sql` substituiu o retorno por `uuid` para o
-- app conseguir liberar o registro exato quando o envio falha.
--
-- Conteúdo reconstruído de `pg_get_functiondef('public.registrar_aviso_email')`
-- e de `proacl` no banco.

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

REVOKE ALL ON FUNCTION public.registrar_aviso_email(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_aviso_email(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_aviso_email(uuid, text, integer) TO service_role;
