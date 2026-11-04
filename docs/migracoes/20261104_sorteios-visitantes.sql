-- Aplicada no Supabase em 04/11/2026.
-- ETAPA 3 — Sorteio para visitantes cadastrados.
--
-- Cadastro público por evento/sorteio, com consentimento próprio (adulto) ou
-- do responsável (menor) reaproveitando a tabela `consentimentos` e a página
-- /consentimento/[token]. Só participantes elegíveis concorrem. O sorteio usa
-- semente auditável e ordem determinística por md5(semente || id).

CREATE TABLE IF NOT EXISTS public.sorteios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('rascunho', 'aberto', 'realizado', 'cancelado')),
  semente text,
  quantidade_vencedores integer NOT NULL DEFAULT 1
    CHECK (quantidade_vencedores BETWEEN 1 AND 100),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  realizado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sorteios_nome_check CHECK (char_length(nome) BETWEEN 3 AND 120)
);

CREATE TABLE IF NOT EXISTS public.sorteio_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteio_id uuid NOT NULL REFERENCES public.sorteios(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  email_responsavel text,
  consentimento_id uuid REFERENCES public.consentimentos(id) ON DELETE SET NULL,
  comunicacoes_consentimento_id uuid REFERENCES public.consentimentos(id) ON DELETE SET NULL,
  elegivel boolean NOT NULL DEFAULT false,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  ordem integer,
  vencedor boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sorteio_participantes_nome_check CHECK (char_length(nome) BETWEEN 3 AND 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS sorteio_participantes_email_uidx
  ON public.sorteio_participantes (sorteio_id, lower(email));

CREATE INDEX IF NOT EXISTS sorteios_evento_idx ON public.sorteios (evento_id);
CREATE INDEX IF NOT EXISTS sorteio_participantes_sorteio_idx ON public.sorteio_participantes (sorteio_id);
CREATE INDEX IF NOT EXISTS sorteio_participantes_consentimento_idx ON public.sorteio_participantes (consentimento_id);

DROP TRIGGER IF EXISTS ao_atualizar_sorteios ON public.sorteios;
CREATE TRIGGER ao_atualizar_sorteios
  BEFORE UPDATE ON public.sorteios
  FOR EACH ROW EXECUTE FUNCTION public.definir_updated_at();

DROP TRIGGER IF EXISTS ao_atualizar_sorteio_participantes ON public.sorteio_participantes;
CREATE TRIGGER ao_atualizar_sorteio_participantes
  BEFORE UPDATE ON public.sorteio_participantes
  FOR EACH ROW EXECUTE FUNCTION public.definir_updated_at();

-- Leitura ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pode_ver_sorteio(p_sorteio_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.eh_admin() or exists (
    select 1
    from public.sorteios s
    where s.id = p_sorteio_id
      and public.pode_gerenciar_evento(s.evento_id)
  );
$function$;

REVOKE ALL ON FUNCTION public.pode_ver_sorteio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_sorteio(uuid) TO authenticated, service_role;

ALTER TABLE public.sorteios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sorteio_participantes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sorteios FROM anon, authenticated;
REVOKE ALL ON TABLE public.sorteio_participantes FROM anon, authenticated;

GRANT SELECT ON TABLE public.sorteios TO authenticated;
GRANT SELECT ON TABLE public.sorteio_participantes TO authenticated;

DROP POLICY IF EXISTS "Organizador ve sorteios" ON public.sorteios;
CREATE POLICY "Organizador ve sorteios"
  ON public.sorteios FOR SELECT TO authenticated
  USING (public.pode_ver_sorteio(id));

DROP POLICY IF EXISTS "Organizador ve participantes do sorteio" ON public.sorteio_participantes;
CREATE POLICY "Organizador ve participantes do sorteio"
  ON public.sorteio_participantes FOR SELECT TO authenticated
  USING (public.pode_ver_sorteio(sorteio_id));

-- Criação ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.criar_sorteio(
  p_evento_id uuid,
  p_nome text,
  p_quantidade_vencedores integer DEFAULT 1
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_nome text := trim(coalesce(p_nome, ''));
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  if not public.pode_gerenciar_evento(p_evento_id) then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  if char_length(v_nome) < 3 or char_length(v_nome) > 120 then
    return jsonb_build_object('ok', false, 'motivo', 'nome_invalido');
  end if;

  if p_quantidade_vencedores is null or p_quantidade_vencedores < 1
     or p_quantidade_vencedores > 100 then
    return jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida');
  end if;

  insert into public.sorteios (
    evento_id, nome, status, quantidade_vencedores, criado_por
  ) values (
    p_evento_id, v_nome, 'aberto', p_quantidade_vencedores, v_uid
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'sorteio_id', v_id);
end;
$function$;

REVOKE ALL ON FUNCTION public.criar_sorteio(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_sorteio(uuid, text, integer) TO authenticated, service_role;

-- Cadastro público -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cadastrar_participante_sorteio(
  p_sorteio_id uuid,
  p_nome text,
  p_email text,
  p_email_responsavel text DEFAULT NULL,
  p_autoriza_comunicacoes boolean DEFAULT false,
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
  v_sorteio public.sorteios%rowtype;
  v_evento public.eventos%rowtype;
  v_nome text := trim(coalesce(p_nome, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_responsavel text := nullif(lower(trim(coalesce(p_email_responsavel, ''))), '');
  v_menor boolean := false;
  v_consentimento_id uuid;
  v_consentimento_token uuid;
  v_comunicacoes_id uuid;
  v_participante_id uuid;
  v_token uuid;
  v_elegivel boolean;
begin
  select * into v_sorteio from public.sorteios where id = p_sorteio_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'sorteio_nao_encontrado');
  end if;

  if v_sorteio.status <> 'aberto' then
    return jsonb_build_object('ok', false, 'motivo', 'sorteio_encerrado');
  end if;

  select * into v_evento from public.eventos where id = v_sorteio.evento_id;

  if not found or v_evento.status <> 'publicado' then
    return jsonb_build_object('ok', false, 'motivo', 'evento_indisponivel');
  end if;

  if char_length(v_nome) < 3 or char_length(v_nome) > 120 then
    return jsonb_build_object('ok', false, 'motivo', 'nome_invalido');
  end if;

  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'motivo', 'email_invalido');
  end if;

  if v_responsavel is not null
     and v_responsavel !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'motivo', 'email_responsavel_invalido');
  end if;

  if exists (
    select 1 from public.sorteio_participantes p
    where p.sorteio_id = p_sorteio_id and lower(p.email) = v_email
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'participante_duplicado');
  end if;

  v_menor := v_responsavel is not null;
  v_elegivel := not v_menor;

  insert into public.consentimentos (
    tipo, versao_termo, email_titular, email_responsavel, status,
    aceito_em, expira_em, ip, user_agent
  ) values (
    'sorteio', trim(p_versao_termo), v_email, v_responsavel,
    case when v_menor then 'pendente' else 'aceito' end,
    case when v_menor then null else now() end,
    case when v_menor then now() + interval '7 days' else null end,
    nullif(trim(coalesce(p_ip, '')), ''),
    nullif(left(coalesce(p_user_agent, ''), 500), '')
  )
  returning id, token into v_consentimento_id, v_consentimento_token;

  insert into public.consentimentos (
    tipo, versao_termo, email_titular, email_responsavel, status,
    aceito_em, ip, user_agent
  ) values (
    'comunicacoes', trim(p_versao_termo), v_email, null,
    case when p_autoriza_comunicacoes then 'aceito' else 'recusado' end,
    case when p_autoriza_comunicacoes then now() else null end,
    nullif(trim(coalesce(p_ip, '')), ''),
    nullif(left(coalesce(p_user_agent, ''), 500), '')
  )
  returning id into v_comunicacoes_id;

  begin
    insert into public.sorteio_participantes (
      sorteio_id, nome, email, email_responsavel, consentimento_id,
      comunicacoes_consentimento_id, elegivel
    ) values (
      p_sorteio_id, v_nome, v_email, v_responsavel, v_consentimento_id,
      v_comunicacoes_id, v_elegivel
    )
    returning id, token into v_participante_id, v_token;
  exception
    when unique_violation then
      delete from public.consentimentos
      where id in (v_consentimento_id, v_comunicacoes_id);
      return jsonb_build_object('ok', false, 'motivo', 'participante_duplicado');
  end;

  return jsonb_build_object(
    'ok', true,
    'participante_id', v_participante_id,
    'token', v_token,
    'menor', v_menor,
    'elegivel', v_elegivel,
    'consentimento_token', case when v_menor then v_consentimento_token else null end,
    'email_responsavel', v_responsavel
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.cadastrar_participante_sorteio(uuid, text, text, text, boolean, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cadastrar_participante_sorteio(uuid, text, text, text, boolean, text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consultar_participante_por_token(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
begin
  select jsonb_build_object(
    'nome', p.nome,
    'elegivel', p.elegivel,
    'status', case
      when p.elegivel then 'elegivel'
      when c.status = 'pendente' then 'aguardando_responsavel'
      else 'inelegivel'
    end,
    'sorteio', jsonb_build_object(
      'id', s.id,
      'nome', s.nome,
      'status', s.status
    ),
    'evento', jsonb_build_object(
      'id', e.id,
      'titulo', e.titulo
    )
  )
  into v_resultado
  from public.sorteio_participantes p
  join public.sorteios s on s.id = p.sorteio_id
  join public.eventos e on e.id = s.evento_id
  left join public.consentimentos c on c.id = p.consentimento_id
  where p.token = p_token;

  return v_resultado;
end;
$function$;

REVOKE ALL ON FUNCTION public.consultar_participante_por_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_participante_por_token(uuid) TO anon, authenticated, service_role;

-- Elegibilidade ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sincronizar_elegibilidade_sorteio()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.tipo <> 'sorteio'
     or new.status not in ('aceito', 'recusado', 'revogado')
     or new.status is not distinct from old.status then
    return new;
  end if;

  update public.sorteio_participantes
  set elegivel = (new.status = 'aceito'),
      updated_at = now()
  where consentimento_id = new.id;

  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.sincronizar_elegibilidade_sorteio() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sincronizar_elegibilidade_sorteio ON public.consentimentos;
CREATE TRIGGER sincronizar_elegibilidade_sorteio
  AFTER UPDATE OF status ON public.consentimentos
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_elegibilidade_sorteio();

-- Painel, sorteio e resultado --------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_listar_participantes_sorteio(p_sorteio_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
begin
  if not public.pode_ver_sorteio(p_sorteio_id) then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'participante_id', p.id,
      'nome', p.nome,
      'email', p.email,
      'email_responsavel', p.email_responsavel,
      'elegivel', p.elegivel,
      'ordem', p.ordem,
      'vencedor', p.vencedor,
      'consentimento_status', c.status,
      'criado_em', p.created_at
    ) order by p.created_at
  ), '[]'::jsonb)
  into v_resultado
  from public.sorteio_participantes p
  left join public.consentimentos c on c.id = p.consentimento_id
  where p.sorteio_id = p_sorteio_id;

  return v_resultado;
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_listar_participantes_sorteio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_participantes_sorteio(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.realizar_sorteio(p_sorteio_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_sorteio public.sorteios%rowtype;
  v_elegiveis integer;
  v_semente text;
  v_vencedores jsonb;
begin
  select * into v_sorteio from public.sorteios where id = p_sorteio_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'sorteio_nao_encontrado');
  end if;

  if not public.pode_gerenciar_evento(v_sorteio.evento_id) then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
  end if;

  if v_sorteio.status = 'realizado' then
    return jsonb_build_object(
      'ok', true,
      'ja_realizado', true,
      'semente', v_sorteio.semente,
      'realizado_em', v_sorteio.realizado_em
    );
  end if;

  if v_sorteio.status <> 'aberto' then
    return jsonb_build_object('ok', false, 'motivo', 'sorteio_encerrado');
  end if;

  select count(*) into v_elegiveis
  from public.sorteio_participantes
  where sorteio_id = p_sorteio_id and elegivel = true;

  if v_elegiveis < v_sorteio.quantidade_vencedores then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'elegiveis_insuficientes',
      'elegiveis', v_elegiveis
    );
  end if;

  v_semente := coalesce(
    v_sorteio.semente,
    encode(extensions.gen_random_bytes(16), 'hex')
  );

  with ordenados as (
    select id, row_number() over (order by md5(v_semente || id::text)) as posicao
    from public.sorteio_participantes
    where sorteio_id = p_sorteio_id and elegivel = true
  )
  update public.sorteio_participantes p
  set ordem = o.posicao,
      vencedor = (o.posicao <= v_sorteio.quantidade_vencedores),
      updated_at = now()
  from ordenados o
  where p.id = o.id;

  update public.sorteios
  set status = 'realizado',
      semente = v_semente,
      realizado_em = now()
  where id = p_sorteio_id;

  select coalesce(jsonb_agg(nome order by ordem), '[]'::jsonb)
  into v_vencedores
  from public.sorteio_participantes
  where sorteio_id = p_sorteio_id and vencedor = true;

  return jsonb_build_object(
    'ok', true,
    'semente', v_semente,
    'realizado_em', now(),
    'vencedores', v_vencedores
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.realizar_sorteio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.realizar_sorteio(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consultar_resultado_sorteio(p_sorteio_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
begin
  select jsonb_build_object(
    'sorteio_id', s.id,
    'nome', s.nome,
    'status', s.status,
    'semente', s.semente,
    'realizado_em', s.realizado_em,
    'quantidade_vencedores', s.quantidade_vencedores,
    'evento', jsonb_build_object(
      'id', e.id,
      'titulo', e.titulo,
      'data_inicio', e.data_inicio
    ),
    'inscritos', (
      select count(*) from public.sorteio_participantes p
      where p.sorteio_id = s.id
    ),
    'vencedores', coalesce((
      select jsonb_agg(p.nome order by p.ordem)
      from public.sorteio_participantes p
      where p.sorteio_id = s.id and p.vencedor = true
    ), '[]'::jsonb)
  )
  into v_resultado
  from public.sorteios s
  join public.eventos e on e.id = s.evento_id
  where s.id = p_sorteio_id
    and e.status = 'publicado';

  return v_resultado;
end;
$function$;

REVOKE ALL ON FUNCTION public.consultar_resultado_sorteio(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_resultado_sorteio(uuid) TO anon, authenticated, service_role;
