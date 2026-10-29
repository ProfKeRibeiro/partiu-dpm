-- Execute no SQL Editor do projeto Supabase conectado à aplicação.
-- O trigger existente ao_criar_usuario cria o perfil antes deste trigger,
-- que copia categoria e curso validados dos metadados do cadastro.
BEGIN;

CREATE OR REPLACE FUNCTION public.aplicar_dados_cadastro_participante()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_categoria text := NEW.raw_user_meta_data ->> 'categoria';
  v_curso text := NEW.raw_user_meta_data ->> 'curso';
BEGIN
  IF v_categoria IS NULL OR v_categoria NOT IN ('aluno', 'servidor', 'externo') THEN
    RETURN NEW;
  END IF;

  IF v_categoria <> 'aluno' THEN
    v_curso := NULL;
  ELSIF v_curso IS NULL OR v_curso NOT IN (
    'COMÉRCIO EXTERIOR',
    'ADMINISTRAÇÃO',
    'INFORMÁTICA PARA INTERNET',
    'DESENVOLVIMENTO DE SISTEMAS',
    'SERVIÇOS JURÍDICOS',
    'SEGURANÇA DO TRABALHO',
    'ENFERMAGEM',
    'MARKETING',
    'RECURSOS HUMANOS',
    'OUTRO'
  ) THEN
    RAISE EXCEPTION 'curso_invalido' USING ERRCODE = '23514';
  END IF;

  UPDATE public.participantes
  SET categoria = v_categoria,
      curso = v_curso
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_dados_cadastro_participante() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aplicar_dados_cadastro_participante() FROM anon;
REVOKE ALL ON FUNCTION public.aplicar_dados_cadastro_participante() FROM authenticated;

DROP TRIGGER IF EXISTS aplicar_dados_cadastro_participante ON auth.users;
CREATE TRIGGER aplicar_dados_cadastro_participante
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.aplicar_dados_cadastro_participante();

COMMIT;