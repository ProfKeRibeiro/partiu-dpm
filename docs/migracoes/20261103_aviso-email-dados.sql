-- Aplicada no Supabase em 03/11/2026.
-- Dados para os e-mails automáticos de inscrição, presença e certificado.
-- Devolve nome/e-mail do participante e os campos do evento em um único jsonb,
-- liberado para o próprio participante e para administradores.

CREATE OR REPLACE FUNCTION public.dados_aviso_inscricao(p_inscricao_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'nome', p.nome_completo,
    'email', u.email,
    'evento', jsonb_build_object(
      'id', e.id,
      'titulo', e.titulo,
      'tipo', e.tipo,
      'modalidade', e.modalidade,
      'local', e.local_evento,
      'inicio', e.data_inicio,
      'fim', e.data_fim
    ),
    'codigo_validacao', c.codigo_validacao
  )
  from public.inscricoes i
  join public.participantes p on p.id = i.participante_id
  join public.eventos e on e.id = i.evento_id
  join auth.users u on u.id = p.id
  left join public.certificados c
    on c.inscricao_id = i.id and c.status = 'emitido'
  where i.id = p_inscricao_id
    and (public.eh_admin() or p.id = (select auth.uid()));
$function$;

REVOKE ALL ON FUNCTION public.dados_aviso_inscricao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dados_aviso_inscricao(uuid) TO authenticated;
