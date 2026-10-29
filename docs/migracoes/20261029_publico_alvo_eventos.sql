-- Execute no SQL Editor do projeto Supabase conectado à aplicação.
BEGIN;

ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_publico_alvo_check;

UPDATE public.eventos
SET publico_alvo = 'comunidade_escolar'
WHERE publico_alvo = 'escola';

UPDATE public.eventos AS evento
SET cursos_permitidos = ARRAY(
  SELECT CASE
    WHEN upper(btrim(item.curso)) IN ('INFORMÁTICA', 'INFORMATICA')
      THEN 'INFORMÁTICA PARA INTERNET'
    ELSE btrim(item.curso)
  END
  FROM unnest(evento.cursos_permitidos) AS item(curso)
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(evento.cursos_permitidos) AS item(curso)
  WHERE upper(btrim(item.curso)) IN ('INFORMÁTICA', 'INFORMATICA')
);

ALTER TABLE public.eventos
  ALTER COLUMN publico_alvo SET DEFAULT 'comunidade_escolar';

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_publico_alvo_check CHECK (publico_alvo IN (
    'alunos_escola',
    'professores_funcionarios',
    'comunidade_escolar',
    'externo',
    'todos'
  ));

CREATE OR REPLACE FUNCTION public.validar_publico_alvo_inscricao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_publico text;
  v_categoria text;
  v_compativel boolean;
BEGIN
  IF NEW.status NOT IN ('confirmada', 'lista_espera') THEN
    RETURN NEW;
  END IF;

  IF public.eh_admin() THEN
    RETURN NEW;
  END IF;

  SELECT evento.publico_alvo
  INTO v_publico
  FROM public.eventos AS evento
  WHERE evento.id = NEW.evento_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT participante.categoria
  INTO v_categoria
  FROM public.participantes AS participante
  WHERE participante.id = NEW.participante_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_compativel := CASE v_publico
    WHEN 'alunos_escola' THEN v_categoria = 'aluno'
    WHEN 'professores_funcionarios' THEN v_categoria = 'servidor'
    WHEN 'comunidade_escolar' THEN v_categoria IN ('aluno', 'servidor')
    WHEN 'escola' THEN v_categoria IN ('aluno', 'servidor')
    WHEN 'externo' THEN v_categoria = 'externo'
    WHEN 'todos' THEN true
    ELSE false
  END;

  IF NOT v_compativel THEN
    RAISE EXCEPTION 'publico_incompativel' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_publico_alvo_inscricao() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validar_publico_alvo_inscricao() FROM anon;
GRANT EXECUTE ON FUNCTION public.validar_publico_alvo_inscricao() TO authenticated;

DROP TRIGGER IF EXISTS validar_publico_alvo_inscricao ON public.inscricoes;
CREATE TRIGGER validar_publico_alvo_inscricao
  BEFORE INSERT OR UPDATE OF evento_id, participante_id, status
  ON public.inscricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_publico_alvo_inscricao();

COMMIT;