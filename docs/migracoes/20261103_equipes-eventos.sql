-- Aplicada no Supabase em 03/11/2026.
-- Eventos de equipe (maratona/competição) com professor orientador.
--
-- 1. Configuração no evento: permite_equipes, equipe_min, equipe_max e
--    exige_orientador.
-- 2. Tabelas equipes/equipe_membros, com código de convite curto e aleatório,
--    um participante por equipe/evento e RLS de leitura (membro, admin ou
--    organizador do evento).
-- 3. Vínculo opcional em inscricoes.equipe_id.
-- 4. RPCs SECURITY DEFINER (search_path vazio): criar, entrar, sair, remover,
--    cancelar, transferir liderança e consulta pública por código.
--
-- As inscrições continuam individuais: cada membro reserva a própria vaga ao
-- entrar e a equipe passa a 'confirmada' quando atinge o mínimo.

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS permite_equipes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS equipe_min integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS equipe_max integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS exige_orientador boolean NOT NULL DEFAULT true;

ALTER TABLE public.eventos DROP CONSTRAINT IF EXISTS eventos_equipe_tamanho_check;
ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_equipe_tamanho_check
  CHECK (
    equipe_min BETWEEN 2 AND 10
    AND equipe_max BETWEEN 2 AND 10
    AND equipe_min <= equipe_max
  );

ALTER TABLE public.inscricoes
  ADD COLUMN IF NOT EXISTS equipe_id uuid;

CREATE TABLE IF NOT EXISTS public.equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  lider_id uuid NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  orientador_nome text,
  orientador_email text,
  codigo text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'formando'
    CHECK (status IN ('formando', 'confirmada', 'cancelada')),
  confirmada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT equipes_nome_check CHECK (char_length(nome) BETWEEN 3 AND 80),
  CONSTRAINT equipes_orientador_email_check CHECK (
    orientador_email IS NULL
    OR orientador_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  )
);

CREATE TABLE IF NOT EXISTS public.equipe_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  participante_id uuid NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  papel text NOT NULL DEFAULT 'membro' CHECK (papel IN ('lider', 'membro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT equipe_membros_unico_por_evento UNIQUE (evento_id, participante_id),
  CONSTRAINT equipe_membros_unico_na_equipe UNIQUE (equipe_id, participante_id)
);

CREATE INDEX IF NOT EXISTS equipes_evento_idx ON public.equipes (evento_id);
CREATE INDEX IF NOT EXISTS equipes_lider_idx ON public.equipes (lider_id);
CREATE INDEX IF NOT EXISTS equipe_membros_equipe_idx ON public.equipe_membros (equipe_id);
CREATE INDEX IF NOT EXISTS equipe_membros_participante_idx ON public.equipe_membros (participante_id);
CREATE INDEX IF NOT EXISTS equipe_membros_evento_idx ON public.equipe_membros (evento_id);

DO $bloco$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inscricoes_equipe_id_fkey'
      AND conrelid = 'public.inscricoes'::regclass
  ) THEN
    ALTER TABLE public.inscricoes
      ADD CONSTRAINT inscricoes_equipe_id_fkey
      FOREIGN KEY (equipe_id) REFERENCES public.equipes(id) ON DELETE SET NULL;
  END IF;
END;
$bloco$;

CREATE INDEX IF NOT EXISTS inscricoes_equipe_idx ON public.inscricoes (equipe_id);

DROP TRIGGER IF EXISTS ao_atualizar_equipes ON public.equipes;
CREATE TRIGGER ao_atualizar_equipes
  BEFORE UPDATE ON public.equipes
  FOR EACH ROW
  EXECUTE FUNCTION public.definir_updated_at();

-- Leitura ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pode_ver_equipe(p_equipe_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.eh_admin() or exists (
    select 1
    from public.equipes e
    where e.id = p_equipe_id
      and public.pode_gerenciar_evento(e.evento_id)
  ) or exists (
    select 1
    from public.equipe_membros m
    where m.equipe_id = p_equipe_id
      and m.participante_id = (select auth.uid())
  );
$function$;

REVOKE ALL ON FUNCTION public.pode_ver_equipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_equipe(uuid) TO authenticated, service_role;

ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe_membros ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.equipes FROM anon, authenticated;
REVOKE ALL ON TABLE public.equipe_membros FROM anon, authenticated;

GRANT SELECT ON TABLE public.equipes TO authenticated;
GRANT SELECT ON TABLE public.equipe_membros TO authenticated;
GRANT SELECT (equipe_id) ON TABLE public.inscricoes TO authenticated;

DROP POLICY IF EXISTS "Membros e organizadores veem equipes" ON public.equipes;
CREATE POLICY "Membros e organizadores veem equipes"
  ON public.equipes
  FOR SELECT
  TO authenticated
  USING (public.pode_ver_equipe(id));

DROP POLICY IF EXISTS "Membros e organizadores veem membros" ON public.equipe_membros;
CREATE POLICY "Membros e organizadores veem membros"
  ON public.equipe_membros
  FOR SELECT
  TO authenticated
  USING (public.pode_ver_equipe(equipe_id));

-- Utilitários internos ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.inscricoes_do_evento_abertas(p_evento_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.eventos e
    where e.id = p_evento_id
      and e.status = 'publicado'
      and now() <= e.data_fim
      and (e.inicio_inscricoes is null or now() >= e.inicio_inscricoes)
      and now() <= coalesce(e.fim_inscricoes, e.data_inicio)
  );
$function$;

REVOKE ALL ON FUNCTION public.inscricoes_do_evento_abertas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inscricoes_do_evento_abertas(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.e_participante_aluno()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.participantes p
    where p.id = (select auth.uid())
      and p.categoria = 'aluno'
  );
$function$;

REVOKE ALL ON FUNCTION public.e_participante_aluno() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.e_participante_aluno() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.garantir_inscricao_equipe(
  p_evento_id uuid,
  p_equipe_id uuid
)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
  v_codigo text;
  v_inscricao_id uuid;
begin
  v_resultado := public.inscrever_em_evento(p_evento_id);
  v_codigo := coalesce(v_resultado->>'codigo', 'erro');

  if coalesce((v_resultado->>'ok')::boolean, false) is false
     and v_codigo not in ('duplicado', 'lista_espera', 'convite_pendente') then
    return v_codigo;
  end if;

  v_inscricao_id := (v_resultado->>'inscricao_id')::uuid;

  if v_inscricao_id is null then
    select i.id into v_inscricao_id
    from public.inscricoes i
    where i.evento_id = p_evento_id
      and i.participante_id = (select auth.uid());
  end if;

  if v_inscricao_id is null then
    return 'inscricao_indisponivel';
  end if;

  update public.inscricoes
  set equipe_id = p_equipe_id
  where id = v_inscricao_id
    and equipe_id is null;

  return 'ok';
end;
$function$;

REVOKE ALL ON FUNCTION public.garantir_inscricao_equipe(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.garantir_inscricao_equipe(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.recalcular_status_equipe(p_equipe_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_min integer;
  v_status text;
  v_total integer;
  v_novo text;
begin
  select e.equipe_min, e.status
    into v_min, v_status
  from public.eventos e
  join public.equipes t on t.evento_id = e.id
  where t.id = p_equipe_id;

  if v_status is null then
    return null;
  end if;

  if v_status = 'cancelada' then
    return 'cancelada';
  end if;

  select count(*) into v_total
  from public.equipe_membros
  where equipe_id = p_equipe_id;

  v_novo := case when v_total >= v_min then 'confirmada' else 'formando' end;

  update public.equipes
  set status = v_novo,
      confirmada_em = case
        when v_novo = 'confirmada' then coalesce(confirmada_em, now())
        else null
      end
  where id = p_equipe_id;

  return v_novo;
end;
$function$;

REVOKE ALL ON FUNCTION public.recalcular_status_equipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalcular_status_equipe(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gerar_codigo_equipe()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_i integer;
begin
  loop
    v_codigo := '';

    for v_i in 1..8 loop
      v_codigo := v_codigo || substr(
        v_alfabeto,
        (1 + floor(random() * length(v_alfabeto)))::integer,
        1
      );
    end loop;

    exit when not exists (
      select 1 from public.equipes where codigo = v_codigo
    );
  end loop;

  return v_codigo;
end;
$function$;

REVOKE ALL ON FUNCTION public.gerar_codigo_equipe() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_codigo_equipe() TO service_role;

-- RPCs públicas para o app -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.criar_equipe(
  p_evento_id uuid,
  p_nome text,
  p_orientador_nome text DEFAULT null,
  p_orientador_email text DEFAULT null
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_evento public.eventos%rowtype;
  v_nome text := trim(coalesce(p_nome, ''));
  v_orientador_nome text := nullif(trim(coalesce(p_orientador_nome, '')), '');
  v_orientador_email text := nullif(lower(trim(coalesce(p_orientador_email, ''))), '');
  v_equipe_id uuid;
  v_codigo text;
  v_inscricao text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  if not public.e_participante_aluno() then
    return jsonb_build_object('ok', false, 'motivo', 'apenas_alunos');
  end if;

  select * into v_evento from public.eventos where id = p_evento_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'evento_nao_encontrado');
  end if;

  if v_evento.permite_equipes is not true then
    return jsonb_build_object('ok', false, 'motivo', 'evento_sem_equipes');
  end if;

  if not public.inscricoes_do_evento_abertas(p_evento_id) then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  if char_length(v_nome) < 3 or char_length(v_nome) > 80 then
    return jsonb_build_object('ok', false, 'motivo', 'nome_invalido');
  end if;

  if v_evento.exige_orientador then
    if v_orientador_nome is null or char_length(v_orientador_nome) < 3 then
      return jsonb_build_object('ok', false, 'motivo', 'orientador_obrigatorio');
    end if;

    if v_orientador_email is null
       or v_orientador_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      return jsonb_build_object('ok', false, 'motivo', 'orientador_email_invalido');
    end if;
  end if;

  if exists (
    select 1 from public.equipe_membros
    where evento_id = p_evento_id and participante_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'ja_em_equipe');
  end if;

  v_codigo := public.gerar_codigo_equipe();

  insert into public.equipes (
    evento_id, lider_id, nome, orientador_nome, orientador_email, codigo
  ) values (
    p_evento_id, v_uid, v_nome, v_orientador_nome, v_orientador_email, v_codigo
  )
  returning id into v_equipe_id;

  insert into public.equipe_membros (equipe_id, evento_id, participante_id, papel)
  values (v_equipe_id, p_evento_id, v_uid, 'lider');

  v_inscricao := public.garantir_inscricao_equipe(p_evento_id, v_equipe_id);

  if v_inscricao <> 'ok' and v_inscricao not in ('lista_espera', 'convite_pendente') then
    raise exception 'equipe_inscricao_%', v_inscricao using errcode = 'P0001';
  end if;

  perform public.recalcular_status_equipe(v_equipe_id);

  return jsonb_build_object(
    'ok', true,
    'equipe_id', v_equipe_id,
    'codigo_convite', v_codigo
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.criar_equipe(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_equipe(uuid, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.entrar_equipe(p_codigo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_equipe public.equipes%rowtype;
  v_evento public.eventos%rowtype;
  v_total integer;
  v_antes text;
  v_depois text;
  v_inscricao text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  if not public.e_participante_aluno() then
    return jsonb_build_object('ok', false, 'motivo', 'apenas_alunos');
  end if;

  select * into v_equipe
  from public.equipes
  where upper(codigo) = upper(trim(coalesce(p_codigo, '')))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_nao_encontrada');
  end if;

  if v_equipe.status = 'cancelada' then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_cancelada');
  end if;

  select * into v_evento from public.eventos where id = v_equipe.evento_id;

  if v_evento.permite_equipes is not true then
    return jsonb_build_object('ok', false, 'motivo', 'evento_sem_equipes');
  end if;

  if not public.inscricoes_do_evento_abertas(v_evento.id) then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  if exists (
    select 1 from public.equipe_membros
    where evento_id = v_evento.id and participante_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'ja_em_equipe');
  end if;

  select count(*) into v_total
  from public.equipe_membros
  where equipe_id = v_equipe.id;

  if v_total >= v_evento.equipe_max then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_cheia');
  end if;

  insert into public.equipe_membros (equipe_id, evento_id, participante_id, papel)
  values (v_equipe.id, v_evento.id, v_uid, 'membro');

  v_inscricao := public.garantir_inscricao_equipe(v_evento.id, v_equipe.id);

  if v_inscricao <> 'ok' and v_inscricao not in ('lista_espera', 'convite_pendente') then
    raise exception 'equipe_inscricao_%', v_inscricao using errcode = 'P0001';
  end if;

  v_antes := v_equipe.status;
  v_depois := public.recalcular_status_equipe(v_equipe.id);

  return jsonb_build_object(
    'ok', true,
    'equipe_id', v_equipe.id,
    'codigo_convite', v_equipe.codigo,
    'status', v_depois,
    'confirmou_agora', v_antes <> 'confirmada' and v_depois = 'confirmada'
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.entrar_equipe(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.entrar_equipe(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sair_equipe(p_equipe_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_equipe public.equipes%rowtype;
  v_membro public.equipe_membros%rowtype;
  v_inscricao_id uuid;
  v_status text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select * into v_equipe from public.equipes where id = p_equipe_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_nao_encontrada');
  end if;

  select * into v_membro
  from public.equipe_membros
  where equipe_id = p_equipe_id and participante_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_e_membro');
  end if;

  if v_membro.papel = 'lider' then
    return jsonb_build_object('ok', false, 'motivo', 'lider_transferir_ou_cancelar');
  end if;

  if not public.inscricoes_do_evento_abertas(v_equipe.evento_id) then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  select id into v_inscricao_id
  from public.inscricoes
  where equipe_id = p_equipe_id and participante_id = v_uid;

  if v_inscricao_id is not null then
    perform public.cancelar_inscricao(v_inscricao_id);
  end if;

  delete from public.equipe_membros where id = v_membro.id;

  v_status := public.recalcular_status_equipe(p_equipe_id);

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$function$;

REVOKE ALL ON FUNCTION public.sair_equipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sair_equipe(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.remover_membro_equipe(
  p_equipe_id uuid,
  p_participante_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_equipe public.equipes%rowtype;
  v_membro public.equipe_membros%rowtype;
  v_inscricao_id uuid;
  v_status text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select * into v_equipe from public.equipes where id = p_equipe_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_nao_encontrada');
  end if;

  if v_equipe.lider_id <> v_uid then
    return jsonb_build_object('ok', false, 'motivo', 'apenas_lider');
  end if;

  if p_participante_id = v_uid then
    return jsonb_build_object('ok', false, 'motivo', 'lider_transferir_ou_cancelar');
  end if;

  if not public.inscricoes_do_evento_abertas(v_equipe.evento_id) then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  select * into v_membro
  from public.equipe_membros
  where equipe_id = p_equipe_id and participante_id = p_participante_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_e_membro');
  end if;

  select id into v_inscricao_id
  from public.inscricoes
  where equipe_id = p_equipe_id and participante_id = p_participante_id;

  if v_inscricao_id is not null then
    perform public.cancelar_inscricao(v_inscricao_id);
  end if;

  delete from public.equipe_membros where id = v_membro.id;

  v_status := public.recalcular_status_equipe(p_equipe_id);

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$function$;

REVOKE ALL ON FUNCTION public.remover_membro_equipe(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remover_membro_equipe(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancelar_equipe(p_equipe_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_equipe public.equipes%rowtype;
  v_inscricao record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select * into v_equipe from public.equipes where id = p_equipe_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_nao_encontrada');
  end if;

  if v_equipe.lider_id <> v_uid and not public.eh_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'apenas_lider');
  end if;

  if v_equipe.status = 'cancelada' then
    return jsonb_build_object('ok', true, 'status', 'cancelada');
  end if;

  if not public.inscricoes_do_evento_abertas(v_equipe.evento_id)
     and not public.eh_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  for v_inscricao in
    select id from public.inscricoes where equipe_id = p_equipe_id
  loop
    perform public.cancelar_inscricao(v_inscricao.id);
  end loop;

  update public.inscricoes set equipe_id = null where equipe_id = p_equipe_id;
  delete from public.equipe_membros where equipe_id = p_equipe_id;

  update public.equipes
  set status = 'cancelada',
      confirmada_em = null
  where id = p_equipe_id;

  return jsonb_build_object('ok', true, 'status', 'cancelada');
end;
$function$;

REVOKE ALL ON FUNCTION public.cancelar_equipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_equipe(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.transferir_lider_equipe(
  p_equipe_id uuid,
  p_novo_lider_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_equipe public.equipes%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select * into v_equipe from public.equipes where id = p_equipe_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_nao_encontrada');
  end if;

  if v_equipe.lider_id <> v_uid then
    return jsonb_build_object('ok', false, 'motivo', 'apenas_lider');
  end if;

  if v_equipe.status = 'cancelada' then
    return jsonb_build_object('ok', false, 'motivo', 'equipe_cancelada');
  end if;

  if not public.inscricoes_do_evento_abertas(v_equipe.evento_id) then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  if not exists (
    select 1 from public.equipe_membros
    where equipe_id = p_equipe_id and participante_id = p_novo_lider_id
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'novo_lider_nao_e_membro');
  end if;

  update public.equipe_membros
  set papel = 'membro'
  where equipe_id = p_equipe_id and participante_id = v_uid;

  update public.equipe_membros
  set papel = 'lider'
  where equipe_id = p_equipe_id and participante_id = p_novo_lider_id;

  update public.equipes
  set lider_id = p_novo_lider_id
  where id = p_equipe_id;

  return jsonb_build_object('ok', true);
end;
$function$;

REVOKE ALL ON FUNCTION public.transferir_lider_equipe(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transferir_lider_equipe(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consultar_equipe_por_codigo(p_codigo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
begin
  select jsonb_build_object(
    'equipe_id', e.id,
    'nome', e.nome,
    'status', e.status,
    'codigo_convite', e.codigo,
    'orientador_nome', e.orientador_nome,
    'evento', jsonb_build_object(
      'id', ev.id,
      'titulo', ev.titulo,
      'data_inicio', ev.data_inicio,
      'data_fim', ev.data_fim,
      'local_evento', ev.local_evento,
      'modalidade', ev.modalidade,
      'equipe_min', ev.equipe_min,
      'equipe_max', ev.equipe_max,
      'exige_orientador', ev.exige_orientador
    ),
    'membros', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('nome', p.nome_completo, 'papel', m.papel)
          order by (m.papel = 'lider') desc, m.created_at
        )
        from public.equipe_membros m
        join public.participantes p on p.id = m.participante_id
        where m.equipe_id = e.id
      ),
      '[]'::jsonb
    ),
    'vagas_restantes', greatest(
      ev.equipe_max - (
        select count(*) from public.equipe_membros m where m.equipe_id = e.id
      ),
      0
    )
  )
  into v_resultado
  from public.equipes e
  join public.eventos ev on ev.id = e.evento_id
  where upper(e.codigo) = upper(trim(coalesce(p_codigo, '')))
    and ev.status = 'publicado';

  return v_resultado;
end;
$function$;

REVOKE ALL ON FUNCTION public.consultar_equipe_por_codigo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_equipe_por_codigo(text) TO anon, authenticated, service_role;
