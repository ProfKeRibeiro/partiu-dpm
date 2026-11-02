-- Aplicada no Supabase em 02/11/2026.
-- 1. Eventos encerrados não podem ser reabertos.
-- 2. Notificações do participante, com RLS e triggers de inscrição, presença e
--    certificado.

-- ---------------------------------------------------------------------------
-- 1. Bloqueio de reabertura
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.impedir_reabertura_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'encerrado' AND NEW.status <> 'encerrado' THEN
    RAISE EXCEPTION 'evento_encerrado' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.impedir_reabertura_evento() FROM PUBLIC;

DROP TRIGGER IF EXISTS impedir_reabertura_evento ON public.eventos;
CREATE TRIGGER impedir_reabertura_evento
  BEFORE UPDATE OF status ON public.eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.impedir_reabertura_evento();

-- ---------------------------------------------------------------------------
-- 2. Notificações
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN (
    'inscricao_confirmada',
    'inscricao_cancelada',
    'lista_espera',
    'presenca_registrada',
    'certificado_emitido',
    'certificado_cancelado'
  )),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  href text,
  lida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notificacoes_usuario_pendentes_idx
  ON public.notificacoes (usuario_id, created_at DESC)
  WHERE lida_em IS NULL;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notificacoes FROM anon, authenticated;
GRANT SELECT ON TABLE public.notificacoes TO authenticated;
GRANT UPDATE (lida_em) ON TABLE public.notificacoes TO authenticated;

DROP POLICY IF EXISTS "Participante le suas notificacoes" ON public.notificacoes;
CREATE POLICY "Participante le suas notificacoes"
  ON public.notificacoes
  FOR SELECT
  TO authenticated
  USING (usuario_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Participante marca suas notificacoes como lidas" ON public.notificacoes;
CREATE POLICY "Participante marca suas notificacoes como lidas"
  ON public.notificacoes
  FOR UPDATE
  TO authenticated
  USING (usuario_id = (SELECT auth.uid()))
  WITH CHECK (usuario_id = (SELECT auth.uid()));

-- Inscrição criada/alterada.
CREATE OR REPLACE FUNCTION public.notificar_inscricao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  evento_titulo text;
BEGIN
  SELECT titulo INTO evento_titulo FROM public.eventos WHERE id = NEW.evento_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'confirmada' THEN
      INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      VALUES (NEW.participante_id, 'inscricao_confirmada', 'Inscrição confirmada',
              'Sua inscrição em ' || evento_titulo || ' está confirmada.', '/conta/inscricoes');
    ELSIF NEW.status = 'lista_espera' THEN
      INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      VALUES (NEW.participante_id, 'lista_espera', 'Você está na lista de espera',
              'Sua inscrição em ' || evento_titulo || ' entrou na lista de espera.', '/conta/inscricoes');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmada' THEN
      INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      VALUES (NEW.participante_id, 'inscricao_confirmada', 'Inscrição confirmada',
              'Sua inscrição em ' || evento_titulo || ' está confirmada.', '/conta/inscricoes');
    ELSIF NEW.status = 'lista_espera' THEN
      INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      VALUES (NEW.participante_id, 'lista_espera', 'Você está na lista de espera',
              'Sua inscrição em ' || evento_titulo || ' entrou na lista de espera.', '/conta/inscricoes');
    ELSIF NEW.status = 'cancelada' THEN
      INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
      VALUES (NEW.participante_id, 'inscricao_cancelada', 'Inscrição cancelada',
              'Sua inscrição em ' || evento_titulo || ' foi cancelada.', '/conta/inscricoes');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_inscricao() FROM PUBLIC;

DROP TRIGGER IF EXISTS notificar_inscricao ON public.inscricoes;
CREATE TRIGGER notificar_inscricao
  AFTER INSERT OR UPDATE OF status ON public.inscricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_inscricao();

-- Presença confirmada.
CREATE OR REPLACE FUNCTION public.notificar_presenca()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  destino record;
BEGIN
  IF NOT NEW.presente OR (TG_OP = 'UPDATE' AND OLD.presente) THEN
    RETURN NEW;
  END IF;

  SELECT i.participante_id AS usuario_id, e.titulo AS evento
    INTO destino
  FROM public.inscricoes AS i
  JOIN public.eventos AS e ON e.id = i.evento_id
  WHERE i.id = NEW.inscricao_id;

  IF destino.usuario_id IS NOT NULL THEN
    INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
    VALUES (destino.usuario_id, 'presenca_registrada', 'Presença registrada',
            'Sua presença em ' || destino.evento || ' foi registrada.', '/conta/inscricoes');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_presenca() FROM PUBLIC;

DROP TRIGGER IF EXISTS notificar_presenca ON public.presencas;
CREATE TRIGGER notificar_presenca
  AFTER INSERT OR UPDATE OF presente ON public.presencas
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_presenca();

-- Certificado emitido ou cancelado.
CREATE OR REPLACE FUNCTION public.notificar_certificado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  destino record;
BEGIN
  SELECT i.participante_id AS usuario_id, e.titulo AS evento
    INTO destino
  FROM public.inscricoes AS i
  JOIN public.eventos AS e ON e.id = i.evento_id
  WHERE i.id = NEW.inscricao_id;

  IF destino.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'emitido' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
    VALUES (destino.usuario_id, 'certificado_emitido', 'Certificado disponível',
            'Seu certificado de ' || destino.evento || ' já pode ser baixado.', '/conta/certificados');
  ELSIF NEW.status = 'cancelado' AND TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
    VALUES (destino.usuario_id, 'certificado_cancelado', 'Certificado cancelado',
            'O certificado de ' || destino.evento || ' foi cancelado pela organização.', '/conta/certificados');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_certificado() FROM PUBLIC;

DROP TRIGGER IF EXISTS notificar_certificado ON public.certificados;
CREATE TRIGGER notificar_certificado
  AFTER INSERT OR UPDATE OF status ON public.certificados
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_certificado();
