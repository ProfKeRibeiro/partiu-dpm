-- Aplicada no Supabase em 08/11/2026.
-- Consentimento de uso de imagem para o card de participação.

ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS autoriza_imagem boolean NOT NULL DEFAULT false;

ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS imagem_autorizada_em timestamptz;

-- Aceite/revogação do próprio usuário para uso da imagem no card.
CREATE OR REPLACE FUNCTION public.registrar_autorizacao_imagem(
  p_autoriza boolean
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_autoriza boolean := coalesce(p_autoriza, false);
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  update public.participantes
  set autoriza_imagem = v_autoriza,
      imagem_autorizada_em = case when v_autoriza then now() end
  where id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'participante_nao_encontrado');
  end if;

  return jsonb_build_object(
    'ok', true,
    'autoriza_imagem', v_autoriza,
    'imagem_autorizada_em', case when v_autoriza then now() end
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.registrar_autorizacao_imagem(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_autorizacao_imagem(boolean) TO authenticated, service_role;

-- Leitura do card: nome, evento, avatar e consentimento de imagem do participante.
CREATE OR REPLACE FUNCTION public.consultar_participacao_card(
  p_inscricao_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_inscricao public.inscricoes%rowtype;
  v_participante public.participantes%rowtype;
  v_evento public.eventos%rowtype;
  v_avatar_path text;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select * into v_inscricao from public.inscricoes where id = p_inscricao_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'inscricao_nao_encontrada');
  end if;

  if v_inscricao.participante_id <> (select auth.uid()) then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  select * into v_participante from public.participantes where id = v_inscricao.participante_id;
  select * into v_evento from public.eventos where id = v_inscricao.evento_id;

  select raw_user_meta_data->>'avatar_path' into v_avatar_path
  from auth.users
  where id = v_inscricao.participante_id;

  return jsonb_build_object(
    'ok', true,
    'nome', v_participante.nome_completo,
    'evento', v_evento.titulo,
    'avatar_path', v_avatar_path,
    'autoriza_imagem', v_participante.autoriza_imagem
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.consultar_participacao_card(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consultar_participacao_card(uuid) TO authenticated, service_role;
