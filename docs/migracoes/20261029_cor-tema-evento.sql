-- Execute no SQL Editor do Supabase antes de publicar eventos com tema.
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS cor_tema text NOT NULL DEFAULT 'azul-petroleo';

ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_cor_tema_check;

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_cor_tema_check CHECK (cor_tema IN (
    'esmeralda', 'verde-floresta', 'lima', 'teal', 'ciano', 'azul-celeste',
    'azul', 'indigo', 'violeta', 'roxo', 'fucsia', 'rosa', 'framboesa',
    'vermelho', 'laranja', 'ambar', 'dourado', 'oliva', 'terracota', 'coral',
    'vinho', 'cafe', 'ardosia', 'grafite', 'turquesa', 'azul-petroleo',
    'azul-marinho', 'lavanda', 'ameixa', 'magenta', 'rubi', 'cobre'
  ));

-- A página pública consulta esta coluna com a chave anon.
GRANT SELECT (cor_tema) ON TABLE public.eventos TO anon, authenticated;

-- Leitura completa para a tela de edição, restrita a administradores. O link
-- de acesso continua indisponível em consultas comuns com a chave pública.
CREATE OR REPLACE FUNCTION public.admin_obter_evento(p_evento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  resultado jsonb;
BEGIN
  IF NOT public.eh_admin() THEN
    RAISE EXCEPTION 'nao_autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(evento) INTO resultado
  FROM public.eventos AS evento
  WHERE evento.id = p_evento_id;

  RETURN resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_obter_evento(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_obter_evento(uuid) TO authenticated;

-- Publicar diretamente pelo painel, garantindo o link de acesso para eventos
-- online/híbridos antes de expor o evento ao público.
CREATE OR REPLACE FUNCTION public.admin_publicar_evento(p_evento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  evento public.eventos%ROWTYPE;
BEGIN
  IF NOT public.eh_admin() THEN
    RAISE EXCEPTION 'nao_autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO evento FROM public.eventos WHERE id = p_evento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'evento_nao_encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF evento.modalidade <> 'presencial' AND coalesce(trim(evento.link_evento), '') = '' THEN
    RAISE EXCEPTION 'link_evento_obrigatorio' USING ERRCODE = '23514';
  END IF;

  UPDATE public.eventos SET status = 'publicado' WHERE id = p_evento_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_publicar_evento(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_publicar_evento(uuid) TO authenticated;
