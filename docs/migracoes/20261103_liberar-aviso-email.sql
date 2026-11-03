-- Aplicada no Supabase em 03/11/2026.
-- Libera o registro de aviso quando o envio falha.
--
-- `registrar_aviso_email` grava a linha antes do envio para impedir e-mail
-- duplicado por duplo clique. Quando o provedor recusa (Brevo/Resend) ou a rede
-- falha, o app remove a linha com `service_role` e a próxima ação pode tentar de
-- novo, em vez de ficar 5 minutos sem aviso e sem retry.
--
-- A remoção só atinge a linha mais recente do par (inscrição, tipo), criada nos
-- últimos 10 minutos, para não apagar um registro de outra requisição.

CREATE OR REPLACE FUNCTION public.liberar_aviso_email(
  p_inscricao_id uuid,
  p_tipo text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  delete from public.avisos_email
  where id = (
    select id
    from public.avisos_email
    where inscricao_id = p_inscricao_id
      and tipo = p_tipo
      and enviado_em > now() - interval '10 minutes'
    order by enviado_em desc
    limit 1
  );
$function$;

REVOKE ALL ON FUNCTION public.liberar_aviso_email(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.liberar_aviso_email(uuid, text) TO service_role;
