-- Aplicada no Supabase em 03/11/2026.
-- Deduplicação de e-mail por id, à prova de concorrência.
--
-- Problemas corrigidos:
-- 1. `registrar_aviso_email` fazia `exists` + `insert` sem trava: dois cliques
--    simultâneos podiam gravar duas linhas e enviar dois e-mails.
-- 2. `liberar_aviso_email(uuid, text)` apagava "a linha mais recente em 10
--    minutos", podendo remover o registro de outra requisição em andamento.
--
-- Agora `registrar_aviso_email` devolve o id da linha criada (NULL quando
-- duplicado ou sem autorização) e `liberar_aviso_email` apaga exatamente esse
-- id. A janela continua valendo para o retry manual (0 segundos).

DROP FUNCTION IF EXISTS public.registrar_aviso_email(uuid, text, integer);

CREATE FUNCTION public.registrar_aviso_email(
  p_inscricao_id uuid,
  p_tipo text,
  p_janela_segundos integer DEFAULT 300
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_autorizado boolean := coalesce(auth.role(), '') = 'service_role';
  v_id uuid;
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
    return null;
  end if;

  -- Serializa a checagem por (inscrição, tipo): duas requisições simultâneas
  -- não conseguem inserir o mesmo aviso.
  perform pg_advisory_xact_lock(
    hashtextextended(p_inscricao_id::text || ':' || p_tipo, 0)
  );

  if exists (
    select 1
    from public.avisos_email
    where inscricao_id = p_inscricao_id
      and tipo = p_tipo
      and enviado_em > now() - make_interval(secs => greatest(p_janela_segundos, 0))
  ) then
    return null;
  end if;

  insert into public.avisos_email (inscricao_id, tipo)
  values (p_inscricao_id, p_tipo)
  returning id into v_id;

  return v_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.registrar_aviso_email(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_aviso_email(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_aviso_email(uuid, text, integer) TO service_role;

DROP FUNCTION IF EXISTS public.liberar_aviso_email(uuid, text);

CREATE FUNCTION public.liberar_aviso_email(p_aviso_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  delete from public.avisos_email
  where id = p_aviso_id;
$function$;

REVOKE ALL ON FUNCTION public.liberar_aviso_email(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.liberar_aviso_email(uuid) TO service_role;
