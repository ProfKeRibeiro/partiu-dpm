-- Aplicada no Supabase em 02/11/2026.
-- 1. Cargo exibido abaixo de cada assinatura do certificado.
-- 2. Nome e cargo da superintendência também passam a ser configuráveis.
-- 3. A validação pública devolve os quatro campos para a rota da imagem.

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS coordenador_cargo text,
  ADD COLUMN IF NOT EXISTS superintendente_nome text,
  ADD COLUMN IF NOT EXISTS superintendente_cargo text;

COMMENT ON COLUMN public.eventos.coordenador_cargo IS
  'Cargo exibido abaixo da assinatura da coordenação no certificado.';
COMMENT ON COLUMN public.eventos.superintendente_nome IS
  'Nome exibido na assinatura da superintendência no certificado.';
COMMENT ON COLUMN public.eventos.superintendente_cargo IS
  'Cargo exibido abaixo da assinatura da superintendência no certificado.';

ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_coordenador_cargo_check,
  DROP CONSTRAINT IF EXISTS eventos_superintendente_nome_check,
  DROP CONSTRAINT IF EXISTS eventos_superintendente_cargo_check;

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_coordenador_cargo_check
  CHECK (coordenador_cargo IS NULL OR char_length(coordenador_cargo) <= 80),
  ADD CONSTRAINT eventos_superintendente_nome_check
  CHECK (superintendente_nome IS NULL OR char_length(superintendente_nome) <= 80),
  ADD CONSTRAINT eventos_superintendente_cargo_check
  CHECK (superintendente_cargo IS NULL OR char_length(superintendente_cargo) <= 80);

UPDATE public.eventos
SET coordenador_cargo = 'Coordenadora de Curso'
WHERE coordenador_cargo IS NULL;

UPDATE public.eventos
SET superintendente_nome = 'Daniela Silva Fogaça'
WHERE superintendente_nome IS NULL;

UPDATE public.eventos
SET superintendente_cargo = 'Superintendente'
WHERE superintendente_cargo IS NULL;

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
    'coordenador_cargo', e.coordenador_cargo,
    'superintendente_nome', e.superintendente_nome,
    'superintendente_cargo', e.superintendente_cargo,
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
