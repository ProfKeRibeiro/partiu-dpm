-- Aplicada no Supabase em 02/11/2026.
-- 1. Nome de quem assina como coordenação do curso no certificado.
-- 2. A validação pública passa a devolver esse nome (e mantém o tipo do evento).
-- 3. Eventos existentes herdam a assinatura que já estava impressa no modelo.

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS coordenador_nome text;

COMMENT ON COLUMN public.eventos.coordenador_nome IS
  'Nome exibido na assinatura da coordenação no certificado.';

ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_coordenador_nome_check;

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_coordenador_nome_check
  CHECK (coordenador_nome IS NULL OR char_length(coordenador_nome) <= 80);

UPDATE public.eventos
SET coordenador_nome = 'Kelly C. G. Ribeiro'
WHERE coordenador_nome IS NULL;

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
    'coordenador_nome', e.coordenador_nome,
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
