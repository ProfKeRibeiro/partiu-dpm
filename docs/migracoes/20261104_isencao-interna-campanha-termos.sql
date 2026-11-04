-- Aplicada no Supabase em 04/11/2026.
-- 1. Isenção de responsável para alunos internos (@aluno.cps.sp.gov.br).
-- 2. Campanha idempotente de re-aceite dos termos.

ALTER TABLE public.consentimentos DROP CONSTRAINT IF EXISTS consentimentos_menor_email_check;ALTER TABLE public.consentimentos
  ADD CONSTRAINT consentimentos_menor_email_check
  CHECK (
    tipo <> 'menor_responsavel'
    OR email_responsavel IS NOT NULL
    OR split_part(lower(coalesce(email_titular, '')), '@', 2) = 'aluno.cps.sp.gov.br'
  );

ALTER TABLE public.alunos_escola
  ALTER COLUMN email_responsavel DROP NOT NULL;

ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;ALTER TABLE public.notificacoes
  ADD CONSTRAINT notificacoes_tipo_check
  CHECK (tipo IN (
    'inscricao_confirmada',
    'inscricao_cancelada',
    'lista_espera',
    'vaga_disponivel',
    'presenca_registrada',
    'certificado_emitido',
    'certificado_cancelado',
    'termos_reaceite'
  ));

CREATE TABLE IF NOT EXISTS public.termos_campanha_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  versao_termo text NOT NULL,
  notificacao_id uuid REFERENCES public.notificacoes(id) ON DELETE SET NULL,
  email_enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT termos_campanha_envios_unico UNIQUE (usuario_id, versao_termo)
);

ALTER TABLE public.termos_campanha_envios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.termos_campanha_envios FROM anon, authenticated;

-- Consentimento de menor com isenção interna ----------------------------------

CREATE OR REPLACE FUNCTION public.criar_consentimento_menor(
  p_email_responsavel text,
  p_inscricao_id uuid DEFAULT NULL,
  p_email_titular text DEFAULT NULL,
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
  v_uid uuid := (select auth.uid());
  v_email_titular text;
  v_interno boolean;
  v_inscricao public.inscricoes%rowtype;
  v_existente public.consentimentos%rowtype;
  v_id uuid;
  v_token uuid;
  v_expira timestamptz;
  v_email_responsavel text := lower(trim(coalesce(p_email_responsavel, '')));
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  v_email_titular := lower(trim(coalesce(
    nullif(p_email_titular, ''),
    (select email from auth.users where id = v_uid),
    ''
  )));
  v_interno := split_part(v_email_titular, '@', 2) = 'aluno.cps.sp.gov.br';

  if not v_interno
     and v_email_responsavel !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'motivo', 'email_responsavel_invalido');
  end if;

  if p_inscricao_id is not null then
    select * into v_inscricao from public.inscricoes where id = p_inscricao_id;

    if not found then
      return jsonb_build_object('ok', false, 'motivo', 'inscricao_nao_encontrada');
    end if;

    if v_inscricao.participante_id <> v_uid and not public.eh_admin() then
      return jsonb_build_object('ok', false, 'motivo', 'nao_autorizado');
    end if;
  end if;

  if v_interno then
    select * into v_existente
    from public.consentimentos c
    where c.tipo = 'menor_responsavel'
      and c.usuario_id = v_uid
      and c.inscricao_id is not distinct from p_inscricao_id
      and c.status in ('pendente', 'aceito')
    order by c.created_at desc
    limit 1;

    if found then
      update public.consentimentos
      set status = 'aceito',
          aceito_em = coalesce(aceito_em, now()),
          email_titular = v_email_titular,
          email_responsavel = null,
          expira_em = null,
          updated_at = now()
      where id = v_existente.id;

      return jsonb_build_object(
        'ok', true,
        'ja_autorizado', true,
        'interno', true,
        'consentimento_id', v_existente.id
      );
    end if;

    insert into public.consentimentos (
      tipo, versao_termo, usuario_id, inscricao_id, email_titular,
      email_responsavel, status, aceito_em, ip, user_agent
    ) values (
      'menor_responsavel', trim(p_versao_termo), v_uid, p_inscricao_id,
      v_email_titular, null, 'aceito', now(),
      nullif(trim(coalesce(p_ip, '')), ''),
      nullif(left(coalesce(p_user_agent, ''), 500), '')
    )
    returning id into v_id;

    return jsonb_build_object(
      'ok', true,
      'ja_autorizado', true,
      'interno', true,
      'consentimento_id', v_id
    );
  end if;

  select * into v_existente
  from public.consentimentos c
  where c.tipo = 'menor_responsavel'
    and c.usuario_id = v_uid
    and c.inscricao_id is not distinct from p_inscricao_id
    and c.status in ('pendente', 'aceito')
  order by c.created_at desc
  limit 1;

  if found and v_existente.status = 'aceito' then
    return jsonb_build_object('ok', true, 'ja_autorizado', true, 'consentimento_id', v_existente.id);
  end if;

  if found and v_existente.status = 'pendente' then
    v_expira := now() + interval '7 days';

    update public.consentimentos
    set email_responsavel = v_email_responsavel,
        email_titular = v_email_titular,
        versao_termo = trim(p_versao_termo),
        expira_em = v_expira,
        ip = nullif(trim(coalesce(p_ip, '')), ''),
        user_agent = nullif(left(coalesce(p_user_agent, ''), 500), ''),
        updated_at = now()
    where id = v_existente.id
    returning id, token into v_id, v_token;

    return jsonb_build_object(
      'ok', true, 'reenviado', true, 'consentimento_id', v_id,
      'token', v_token, 'email_responsavel', v_email_responsavel, 'expira_em', v_expira
    );
  end if;

  v_expira := now() + interval '7 days';

  insert into public.consentimentos (
    tipo, versao_termo, usuario_id, inscricao_id, email_titular,
    email_responsavel, status, expira_em, ip, user_agent
  ) values (
    'menor_responsavel', trim(p_versao_termo), v_uid, p_inscricao_id,
    v_email_titular, v_email_responsavel, 'pendente', v_expira,
    nullif(trim(coalesce(p_ip, '')), ''),
    nullif(left(coalesce(p_user_agent, ''), 500), '')
  )
  returning id, token into v_id, v_token;

  return jsonb_build_object(
    'ok', true, 'consentimento_id', v_id, 'token', v_token,
    'email_responsavel', v_email_responsavel, 'expira_em', v_expira
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.criar_consentimento_menor(text, uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_consentimento_menor(text, uuid, text, text, text, text) TO authenticated, service_role;

-- Subinscrição de escola com isenção interna ---------------------------------

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
  v_interno boolean;
  v_consentimento_id uuid;
  v_token uuid;
  v_aluno_id uuid;
begin
  select * into v_escola
  from public.escolas_inscricoes
  where upper(codigo) = upper(trim(coalesce(p_codigo, ''))) and status = 'ativa';

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

  v_interno := split_part(v_email, '@', 2) = 'aluno.cps.sp.gov.br';

  if not v_interno and v_responsavel !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'motivo', 'email_responsavel_invalido');
  end if;

  if v_interno then
    v_responsavel := '';
  end if;

  if exists (
    select 1 from public.alunos_escola a
    where a.evento_id = v_evento.id and lower(a.email) = v_email
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'aluno_duplicado');
  end if;

  insert into public.consentimentos (
    tipo, versao_termo, usuario_id, email_titular, email_responsavel,
    status, aceito_em, expira_em, ip, user_agent
  ) values (
    'menor_responsavel', trim(p_versao_termo), null, v_email,
    nullif(v_responsavel, ''),
    case when v_interno then 'aceito' else 'pendente' end,
    case when v_interno then now() else null end,
    case when v_interno then null else now() + interval '7 days' end,
    nullif(trim(coalesce(p_ip, '')), ''),
    nullif(left(coalesce(p_user_agent, ''), 500), '')
  )
  returning id, token into v_consentimento_id, v_token;

  begin
    insert into public.alunos_escola (
      escola_inscricao_id, evento_id, nome, email, email_responsavel, consentimento_id
    ) values (
      v_escola.id, v_evento.id, v_nome, v_email, nullif(v_responsavel, ''), v_consentimento_id
    )
    returning id into v_aluno_id;
  exception
    when unique_violation then
      delete from public.consentimentos where id = v_consentimento_id;
      return jsonb_build_object('ok', false, 'motivo', 'aluno_duplicado');
  end;

  if v_interno then
    perform public.efetivar_aluno_escola(v_aluno_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'aluno_id', v_aluno_id,
    'consentimento_id', v_consentimento_id,
    'token', v_token,
    'interno', v_interno,
    'autorizado', v_interno,
    'email_responsavel', nullif(v_responsavel, '')
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.entrar_por_link_escola(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrar_por_link_escola(text, text, text, text, text, text, text) TO anon, authenticated, service_role;

-- Sorteio com isenção interna --------------------------------------------------

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
  v_interno boolean;
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

  v_interno := split_part(v_email, '@', 2) = 'aluno.cps.sp.gov.br';

  if v_interno then
    v_responsavel := null;
  end if;

  if not v_interno and v_responsavel is not null
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
  v_elegivel := v_interno or not v_menor;

  insert into public.consentimentos (
    tipo, versao_termo, email_titular, email_responsavel, status,
    aceito_em, expira_em, ip, user_agent
  ) values (
    'sorteio', trim(p_versao_termo), v_email, v_responsavel,
    case when v_interno then 'aceito' when v_menor then 'pendente' else 'aceito' end,
    case when v_interno or not v_menor then now() else null end,
    case when v_menor and not v_interno then now() + interval '7 days' else null end,
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
      delete from public.consentimentos where id in (v_consentimento_id, v_comunicacoes_id);
      return jsonb_build_object('ok', false, 'motivo', 'participante_duplicado');
  end;

  return jsonb_build_object(
    'ok', true,
    'participante_id', v_participante_id,
    'token', v_token,
    'interno', v_interno,
    'menor', v_menor,
    'elegivel', v_elegivel,
    'consentimento_token', case when v_menor and not v_interno then v_consentimento_token else null end,
    'email_responsavel', v_responsavel
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.cadastrar_participante_sorteio(uuid, text, text, text, boolean, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cadastrar_participante_sorteio(uuid, text, text, text, boolean, text, text, text) TO anon, authenticated, service_role;

-- Campanha de re-aceite --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_campanha_reaceite_termos(p_versao text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_versao text := trim(coalesce(p_versao, ''));
  v_usuario record;
  v_envio_id uuid;
  v_notificacao_id uuid;
  v_lista jsonb := '[]'::jsonb;
begin
  if not public.eh_admin() then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;

  if char_length(v_versao) = 0 or char_length(v_versao) > 40 then
    return jsonb_build_object('ok', false, 'motivo', 'versao_invalida');
  end if;

  for v_usuario in
    select u.id, u.email,
           coalesce(p.nome_completo, split_part(coalesce(u.email, ''), '@', 1)) as nome
    from auth.users u
    left join public.participantes p on p.id = u.id
    where u.email is not null
      and not exists (
        select 1 from public.consentimentos c
        where c.usuario_id = u.id and c.tipo = 'termos_uso'
          and c.versao_termo = v_versao and c.status = 'aceito'
      )
      and not exists (
        select 1 from public.termos_campanha_envios e
        where e.usuario_id = u.id and e.versao_termo = v_versao
      )
    order by u.created_at
  loop
    insert into public.termos_campanha_envios (usuario_id, versao_termo)
    values (v_usuario.id, v_versao)
    on conflict (usuario_id, versao_termo) do nothing
    returning id into v_envio_id;

    if v_envio_id is null then
      continue;
    end if;

    insert into public.notificacoes (usuario_id, tipo, titulo, mensagem, href)
    values (
      v_usuario.id,
      'termos_reaceite',
      'Atualize seu aceite dos termos',
      'Os termos de uso foram atualizados. Leia e aceite a versão ' || v_versao || '.',
      '/termos'
    )
    returning id into v_notificacao_id;

    update public.termos_campanha_envios
    set notificacao_id = v_notificacao_id
    where id = v_envio_id;

    v_lista := v_lista || jsonb_build_array(jsonb_build_object(
      'usuario_id', v_usuario.id,
      'nome', v_usuario.nome,
      'email', v_usuario.email
    ));
  end loop;

  return jsonb_build_object(
    'ok', true,
    'versao_termo', v_versao,
    'novos', jsonb_array_length(v_lista),
    'usuarios', v_lista
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_campanha_reaceite_termos(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_campanha_reaceite_termos(text) TO authenticated, service_role;
