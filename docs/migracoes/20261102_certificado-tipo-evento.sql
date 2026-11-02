-- Aplicada no Supabase em 02/11/2026.
-- Inclui o tipo do evento no retorno público do certificado para montar a frase
-- "participou do/da <tipo>" na imagem.

CREATE OR REPLACE FUNCTION public.validar_certificado(p_codigo uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
begin
  select jsonb_build_object(
    'codigo_validacao', c.codigo_validacao,
    'status', c.status,
    'data_emissao', c.data_emissao,
    'arquivo_url', c.arquivo_url,
    'participante', p.nome_completo,
    'evento', e.titulo,
    'tipo', e.tipo,
    'evento_inicio', e.data_inicio,
    'evento_fim', e.data_fim,
    'modalidade', e.modalidade,
    'local_evento', e.local_evento
  )
  into v_resultado
  from public.certificados c
  join public.inscricoes i on i.id = c.inscricao_id
  join public.participantes p on p.id = i.participante_id
  join public.eventos e on e.id = i.evento_id
  where c.codigo_validacao = p_codigo
    and c.status = 'emitido';

  return v_resultado;
end;
$function$;
