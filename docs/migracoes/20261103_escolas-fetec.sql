-- Aplicada no Supabase em 03/11/2026.
-- ETAPA 2 — Escolas no FETEC.
--
-- Professor/coordenador @cps.sp.gov.br cria a inscrição da escola e recebe um
-- código de subinscrição. Cada aluno entra pelo código, informa o e-mail do
-- responsável e fica pendente até o aceite (tabela consentimentos da etapa 1).
-- No aceite, o aluno vira 'autorizado', ganha participante/conta e inscrição
-- no evento, para presença e certificado funcionarem.
--
-- RLS: admin, organizador do evento e o professor responsável pela escola leem;
-- público só pela RPC de consulta por código, sem e-mails.

CREATE TABLE IF NOT EXISTS public.escolas_inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  escola_nome text NOT NULL,
  responsavel_nome text NOT NULL,
  responsavel_email text NOT NULL,
  responsavel_usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escolas_inscricoes_nome_check CHECK (char_length(escola_nome) BETWEEN 3 AND 120),
  CONSTRAINT escolas_inscricoes_responsavel_check CHECK (char_length(responsavel_nome) BETWEEN 3 AND 80)
);

CREATE TABLE IF NOT EXISTS public.alunos_escola (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_inscricao_id uuid NOT NULL REFERENCES public.escolas_inscricoes(id) ON DELETE CASCADE,
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  email_responsavel text NOT NULL,
  consentimento_id uuid REFERENCES public.consentimentos(id) ON DELETE SET NULL,
  participante_id uuid REFERENCES public.participantes(id) ON DELETE SET NULL,
  inscricao_id uuid REFERENCES public.inscricoes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizado', 'recusado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alunos_escola_nome_check CHECK (char_length(nome) BETWEEN 3 AND 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS alunos_escola_email_escola_uidx
  ON public.alunos_escola (escola_inscricao_id, lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS alunos_escola_email_evento_uidx
  ON public.alunos_escola (evento_id, lower(email));

CREATE INDEX IF NOT EXISTS escolas_inscricoes_evento_idx ON public.escolas_inscricoes (evento_id);
CREATE INDEX IF NOT EXISTS escolas_inscricoes_responsavel_idx ON public.escolas_inscricoes (responsavel_usuario_id);
CREATE INDEX IF NOT EXISTS alunos_escola_escola_idx ON public.alunos_escola (escola_inscricao_id);
CREATE INDEX IF NOT EXISTS alunos_escola_evento_idx ON public.alunos_escola (evento_id);
CREATE INDEX IF NOT EXISTS alunos_escola_consentimento_idx ON public.alunos_escola (consentimento_id);

DROP TRIGGER IF EXISTS ao_atualizar_escolas_inscricoes ON public.escolas_inscricoes;
CREATE TRIGGER ao_atualizar_escolas_inscricoes
  BEFORE UPDATE ON public.escolas_inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.definir_updated_at();

DROP TRIGGER IF EXISTS ao_atualizar_alunos_escola ON public.alunos_escola;
CREATE TRIGGER ao_atualizar_alunos_escola
  BEFORE UPDATE ON public.alunos_escola
  FOR EACH ROW EXECUTE FUNCTION public.definir_updated_at();

-- Leitura ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pode_ver_escola_inscricao(p_escola_inscricao_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.eh_admin() or exists (
    select 1
    from public.escolas_inscricoes e
    where e.id = p_escola_inscricao_id
      and (
        e.responsavel_usuario_id = (select auth.uid())
        or public.pode_gerenciar_evento(e.evento_id)
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.pode_ver_escola_inscricao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_escola_inscricao(uuid) TO authenticated, service_role;

ALTER TABLE public.escolas_inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos_escola ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.escolas_inscricoes FROM anon, authenticated;
REVOKE ALL ON TABLE public.alunos_escola FROM anon, authenticated;

GRANT SELECT ON TABLE public.escolas_inscricoes TO authenticated;
GRANT SELECT ON TABLE public.alunos_escola TO authenticated;

DROP POLICY IF EXISTS "Responsavel e organizador veem escola" ON public.escolas_inscricoes;
CREATE POLICY "Responsavel e organizador veem escola"
  ON public.escolas_inscricoes FOR SELECT TO authenticated
  USING (public.pode_ver_escola_inscricao(id));

DROP POLICY IF EXISTS "Responsavel e organizador veem alunos" ON public.alunos_escola;
CREATE POLICY "Responsavel e organizador veem alunos"
  ON public.alunos_escola FOR SELECT TO authenticated
  USING (public.pode_ver_escola_inscricao(escola_inscricao_id));

-- Código e criação -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.gerar_codigo_escola()
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
    exit when not exists (select 1 from public.escolas_inscricoes where codigo = v_codigo);
  end loop;
  return v_codigo;
end;
$function$;

REVOKE ALL ON FUNCTION public.gerar_codigo_escola() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_codigo_escola() TO service_role;

CREATE OR REPLACE FUNCTION public.criar_inscricao_escola(
  p_evento_id uuid,
  p_escola_nome text,
  p_responsavel_nome text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_evento public.eventos%rowtype;
  v_escola text := trim(coalesce(p_escola_nome, ''));
  v_responsavel text := trim(coalesce(p_responsavel_nome, ''));
  v_id uuid;
  v_codigo text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  select email into v_email from auth.users where id = v_uid;

  if v_email is null
     or split_part(lower(v_email), '@', 2) <> 'cps.sp.gov.br' then
    return jsonb_build_object('ok', false, 'motivo', 'apenas_cps');
  end if;

  select * into v_evento from public.eventos where id = p_evento_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'evento_nao_encontrado');
  end if;

  if not public.inscricoes_do_evento_abertas(p_evento_id) then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  if char_length(v_escola) < 3 or char_length(v_escola) > 120 then
    return jsonb_build_object('ok', false, 'motivo', 'escola_nome_invalido');
  end if;

  if char_length(v_responsavel) < 3 or char_length(v_responsavel) > 80 then
    return jsonb_build_object('ok', false, 'motivo', 'responsavel_nome_invalido');
  end if;

  v_codigo := public.gerar_codigo_escola();

  insert into public.escolas_inscricoes (
    evento_id, escola_nome, responsavel_nome, responsavel_email,
    responsavel_usuario_id, codigo
  ) values (
    p_evento_id, v_escola, v_responsavel, lower(v_email), v_uid, v_codigo
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'escola_inscricao_id', v_id,
    'codigo', v_codigo
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.criar_inscricao_escola(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_inscricao_escola(uuid, text, text) TO authenticated, service_role;

-- Subinscrição do aluno --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.entrar_por_link_escola(
  p_codigo text,
  p_nome text,
  p_email text,
  p_email_responsavel text,
  p_versao_termo text DEFAULT '03/11/2026',
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_escola public.escolas_inscricoes%rowtype;
  v_evento public.eventos%rowtype;
  v_nome text := trim(coalesce(p_nome, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_responsavel text := lower(trim(coalesce(p_email_responsavel, '')));
  v_consentimento_id uuid;
  v_token uuid;
  v_aluno_id uuid;
begin
  select * into v_escola
  from public.escolas_inscricoes
  where upper(codigo) = upper(trim(coalesce(p_codigo, '')))
    and status = 'ativa';

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'codigo_invalido');
  end if;

  select * into v_evento from public.eventos where id = v_escola.evento_id;

  if not found or not public.inscricoes_do_evento_abertas(v_evento.id) then
    return jsonb_build_object('ok', false, 'motivo', 'inscricoes_encerradas');
  end if;

  if char_length(v_nome) < 3 or char_length(v_nome) > 120 then
    return jsonb_build_object('ok', false, 'motivo', 'nome_invalido');
  end if;

  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'motivo', 'email_invalido');
  end if;

  if v_responsavel !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'motivo', 'email_responsavel_invalido');
  end if;

  if exists (
    select 1 from public.alunos_escola a
    where a.evento_id = v_evento.id and lower(a.email) = v_email
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'aluno_duplicado');
  end if;

  insert into public.consentimentos (
    tipo, versao_termo, usuario_id, email_titular, email_responsavel,
    status, expira_em, ip, user_agent
  ) values (
    'menor_responsavel', trim(p_versao_termo), null, v_email, v_responsavel,
    'pendente', now() + interval '7 days',
    nullif(trim(coalesce(p_ip, '')), ''),
    nullif(left(coalesce(p_user_agent, ''), 500), '')
  )
  returning id, token into v_consentimento_id, v_token;

  begin
    insert into public.alunos_escola (
      escola_inscricao_id, evento_id, nome, email, email_responsavel, consentimento_id
    ) values (
      v_escola.id, v_evento.id, v_nome, v_email, v_responsavel, v_consentimento_id
    )
    returning id into v_aluno_id;
  exception
    when unique_violation then
      delete from public.consentimentos where id = v_consentimento_id;
      return jsonb_build_object('ok', false, 'motivo', 'aluno_duplicado');
  end;

  return jsonb_build_object(
    'ok', true,
    'aluno_id', v_aluno_id,
    'consentimento_id', v_consentimento_id,
    'token', v_token,
    'email_responsavel', v_responsavel
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.entrar_por_link_escola(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrar_por_link_escola(text, text, text, text, text, text, text) TO anon, authenticated, service_role;

-- Efetivação -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.garantir_participante_escola(
  p_nome text,
  p_email text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_nome text := trim(coalesce(p_nome, ''));
  v_id uuid;
begin
  select p.id into v_id
  from public.participantes p
  join auth.users u on u.id = p.id
  where lower(u.email) = v_email
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  begin
    insert into auth.users (
      id, instance_id, aud, role, email, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', v_email, now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome_completo', v_nome),
      '', '', '', '', '', '', '', ''
    )
    returning id into v_id;
  exception
    when unique_violation then
      select p.id into v_id
      from public.participantes p
      join auth.users u on u.id = p.id
      where lower(u.email) = v_email
      limit 1;
      return v_id;
  end;

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', v_email),
    now(), now(), now()
  )
  on conflict do nothing;

  return v_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.garantir_participante_escola(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.garantir_participante_escola(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.efetivar_aluno_escola(p_aluno_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_aluno public.alunos_escola%rowtype;
  v_participante_id uuid;
  v_inscricao_id uuid;
  v_status text;
  v_limite integer;
  v_confirmadas integer;
begin
  select * into v_aluno from public.alunos_escola where id = p_aluno_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'aluno_nao_encontrado');
  end if;

  if v_aluno.status = 'autorizado' and v_aluno.inscricao_id is not null then
    return jsonb_build_object(
      'ok', true,
      'participante_id', v_aluno.participante_id,
      'inscricao_id', v_aluno.inscricao_id
    );
  end if;

  v_participante_id := public.garantir_participante_escola(v_aluno.nome, v_aluno.email);

  select i.id, i.status into v_inscricao_id, v_status
  from public.inscricoes i
  where i.evento_id = v_aluno.evento_id
    and i.participante_id = v_participante_id;

  if v_inscricao_id is not null then
    if v_status = 'cancelada' then
      update public.inscricoes
      set status = 'confirmada',
          data_inscricao = now()
      where id = v_inscricao_id;
    end if;
  else
    select limite_vagas into v_limite from public.eventos where id = v_aluno.evento_id;

    select count(*) into v_confirmadas
    from public.inscricoes
    where evento_id = v_aluno.evento_id
      and status in ('confirmada', 'aguardando_confirmacao');

    v_status := case
      when v_limite is null or v_confirmadas < v_limite then 'confirmada'
      else 'lista_espera'
    end;

    insert into public.inscricoes (evento_id, participante_id, status)
    values (v_aluno.evento_id, v_participante_id, v_status)
    returning id into v_inscricao_id;
  end if;

  update public.alunos_escola
  set status = 'autorizado',
      participante_id = v_participante_id,
      inscricao_id = v_inscricao_id,
      updated_at = now()
  where id = p_aluno_id;

  return jsonb_build_object(
    'ok', true,
    'participante_id', v_participante_id,
    'inscricao_id', v_inscricao_id,
    'inscricao_status', coalesce(v_status, 'confirmada')
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.efetivar_aluno_escola(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.efetivar_aluno_escola(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.sincronizar_aluno_escola_consentimento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_aluno_id uuid;
begin
  if new.tipo <> 'menor_responsavel'
     or new.status not in ('aceito', 'recusado')
     or new.status is not distinct from old.status then
    return new;
  end if;

  select id into v_aluno_id
  from public.alunos_escola
  where consentimento_id = new.id
  limit 1;

  if v_aluno_id is null then
    return new;
  end if;

  if new.status = 'recusado' then
    update public.alunos_escola
    set status = 'recusado',
        updated_at = now()
    where id = v_aluno_id;
  else
    perform public.efetivar_aluno_escola(v_aluno_id);
  end if;

  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.sincronizar_aluno_escola_consentimento() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sincronizar_aluno_escola_consentimento ON public.consentimentos;
CREATE TRIGGER sincronizar_aluno_escola_consentimento
  AFTER UPDATE OF status ON public.consentimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.sincronizar_aluno_escola_consentimento();

-- Consultas públicas e painel --------------------------------------------------

CREATE OR REPLACE FUNCTION public.consultar_escola_por_codigo(p_codigo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
begin
  select jsonb_build_object(
    'escola_inscricao_id', e.id,
    'escola_nome', e.escola_nome,
    'status', e.status,
    'codigo', e.codigo,
    'evento', jsonb_build_object(
      'id', ev.id,
      'titulo', ev.titulo,
      'data_inicio', ev.data_inicio,
      'local_evento', ev.local_evento,
      'modalidade', ev.modalidade
    ),
    'autorizados', (
      select count(*) from public.alunos_escola a
      where a.escola_inscricao_id = e.id and a.status = 'autorizado'
    ),
    'pendentes', (
      select count(*) from public.alunos_escola a
      where a.escola_inscricao_id = e.id and a.status = 'pendente'
    )
  )
  into v_resultado
  from public.escolas_inscricoes e
  join public.eventos ev on ev.id = e.evento_id
  where upper(e.codigo) = upper(trim(coalesce(p_codigo, '')))
    and e.status = 'ativa'
    and ev.status = 'publicado';

  return v_resultado;
end;
$function$;

REVOKE ALL ON FUNCTION public.consultar_escola_por_codigo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_escola_por_codigo(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_listar_escolas_evento(p_evento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
begin
  if not public.pode_gerenciar_evento(p_evento_id) then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'escola_inscricao_id', e.id,
        'escola_nome', e.escola_nome,
        'responsavel_nome', e.responsavel_nome,
        'responsavel_email', e.responsavel_email,
        'codigo', e.codigo,
        'status', e.status,
        'criado_em', e.created_at,
        'autorizados', (
          select count(*) from public.alunos_escola a
          where a.escola_inscricao_id = e.id and a.status = 'autorizado'
        ),
        'pendentes', (
          select count(*) from public.alunos_escola a
          where a.escola_inscricao_id = e.id and a.status = 'pendente'
        ),
        'alunos', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'nome', a.nome,
              'email', a.email,
              'status', a.status,
              'inscricao_id', a.inscricao_id,
              'criado_em', a.created_at
            )
            order by a.created_at
          )
          from public.alunos_escola a
          where a.escola_inscricao_id = e.id
        ), '[]'::jsonb)
      )
      order by e.created_at desc
    ),
    '[]'::jsonb
  )
  into v_resultado
  from public.escolas_inscricoes e
  where e.evento_id = p_evento_id;

  return v_resultado;
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_listar_escolas_evento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_escolas_evento(uuid) TO authenticated, service_role;
