-- Aplicada no Supabase em 03/11/2026.
-- 1. Inscrição em lista de espera quando o evento está lotado.
-- 2. Controle de avisos por e-mail para não repetir mensagens.

-- ---------------------------------------------------------------------------
-- 1. Inscrição / lista de espera
-- ---------------------------------------------------------------------------
-- (definição completa de public.inscrever_em_evento)

CREATE OR REPLACE FUNCTION public.inscrever_em_evento(p_evento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_evento public.eventos%rowtype;
  v_participante public.participantes%rowtype;
  v_inscricao public.inscricoes%rowtype;
  v_total integer;
  v_inscricao_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'nao_autenticado');
  end if;

  select * into v_participante
  from public.participantes
  where id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'perfil_nao_encontrado');
  end if;

  -- Serializa as inscricoes do mesmo evento para evitar estouro de vagas.
  select * into v_evento
  from public.eventos
  where id = p_evento_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'evento_nao_encontrado');
  end if;

  if v_evento.status <> 'publicado' then
    return jsonb_build_object('ok', false, 'codigo', 'evento_indisponivel');
  end if;

  if now() > v_evento.data_fim then
    return jsonb_build_object('ok', false, 'codigo', 'evento_encerrado');
  end if;

  if v_evento.inicio_inscricoes is not null
     and now() < v_evento.inicio_inscricoes then
    return jsonb_build_object('ok', false, 'codigo', 'inscricoes_em_breve');
  end if;

  if now() > coalesce(v_evento.fim_inscricoes, v_evento.data_inicio) then
    return jsonb_build_object('ok', false, 'codigo', 'inscricoes_encerradas');
  end if;

  if v_evento.publico_alvo = 'escola'
     and v_participante.categoria not in ('aluno', 'servidor') then
    return jsonb_build_object('ok', false, 'codigo', 'publico_incompativel');
  end if;

  if v_evento.publico_alvo = 'externo'
     and v_participante.categoria <> 'externo' then
    return jsonb_build_object('ok', false, 'codigo', 'publico_incompativel');
  end if;

  if cardinality(v_evento.cursos_permitidos) > 0
     and (
       v_participante.curso is null
       or not (v_participante.curso = any (v_evento.cursos_permitidos))
     ) then
    return jsonb_build_object('ok', false, 'codigo', 'curso_incompativel');
  end if;

  if cardinality(v_evento.series_permitidas) > 0
     and (
       v_participante.ano_serie is null
       or not (v_participante.ano_serie = any (v_evento.series_permitidas))
     ) then
    return jsonb_build_object('ok', false, 'codigo', 'serie_incompativel');
  end if;

  select * into v_inscricao
  from public.inscricoes
  where evento_id = p_evento_id
    and participante_id = v_uid;

  if v_inscricao.id is not null then
    if v_inscricao.status = 'confirmada' then
      return jsonb_build_object('ok', false, 'codigo', 'duplicado');
    elsif v_inscricao.status = 'lista_espera' then
      return jsonb_build_object('ok', false, 'codigo', 'lista_espera');
    end if;
  end if;

  if v_evento.limite_vagas is not null then
    select count(*) into v_total
    from public.inscricoes
    where evento_id = p_evento_id
      and status = 'confirmada';

    if v_total >= v_evento.limite_vagas then
      if v_inscricao.id is not null and v_inscricao.status = 'cancelada' then
        update public.inscricoes
        set status = 'lista_espera',
            data_inscricao = now()
        where id = v_inscricao.id
        returning id into v_inscricao_id;
      else
        insert into public.inscricoes (evento_id, participante_id, status)
        values (p_evento_id, v_uid, 'lista_espera')
        returning id into v_inscricao_id;
      end if;

      return jsonb_build_object(
        'ok', true,
        'codigo', 'lista_espera',
        'inscricao_id', v_inscricao_id
      );
    end if;
  end if;

  if v_inscricao.id is not null and v_inscricao.status = 'cancelada' then
    update public.inscricoes
    set status = 'confirmada',
        data_inscricao = now()
    where id = v_inscricao.id
    returning id into v_inscricao_id;
  else
    insert into public.inscricoes (evento_id, participante_id, status)
    values (p_evento_id, v_uid, 'confirmada')
    returning id into v_inscricao_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'codigo', 'inscrito',
    'inscricao_id', v_inscricao_id
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'codigo', 'duplicado');
end;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Avisos por e-mail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avisos_email (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL REFERENCES public.inscricoes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  enviado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS avisos_email_recentes_idx
  ON public.avisos_email (inscricao_id, tipo, enviado_em DESC);

ALTER TABLE public.avisos_email ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.avisos_email FROM anon, authenticated;

-- Devolve true quando o aviso pode ser enviado e registra o envio. A janela
-- evita segundo e-mail por duplo clique/atualização; o reenvio manual usa 0.
CREATE OR REPLACE FUNCTION public.registrar_aviso_email(
  p_inscricao_id uuid,
  p_tipo text,
  p_janela_segundos integer DEFAULT 300
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from public.avisos_email
    where inscricao_id = p_inscricao_id
      and tipo = p_tipo
      and enviado_em > now() - make_interval(secs => greatest(p_janela_segundos, 0))
  ) then
    return false;
  end if;

  insert into public.avisos_email (inscricao_id, tipo)
  values (p_inscricao_id, p_tipo);

  return true;
end;
$function$;

REVOKE ALL ON FUNCTION public.registrar_aviso_email(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_aviso_email(uuid, text, integer) TO authenticated;
