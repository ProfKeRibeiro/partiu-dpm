-- Aplicada no Supabase em 06/11/2026.
-- Canal WhatsApp para o link de aceite do responsável (Meta WhatsApp Cloud API).

ALTER TABLE public.consentimentos
  ADD COLUMN IF NOT EXISTS telefone_responsavel text;

ALTER TABLE public.consentimentos
  ADD COLUMN IF NOT EXISTS whatsapp_enviado_em timestamptz;

-- Consentimento do responsável por menor: aceita o telefone e o persiste/retorna.
DROP FUNCTION IF EXISTS public.criar_consentimento_menor(text, uuid, text, text, text, text);
CREATE OR REPLACE FUNCTION public.criar_consentimento_menor(
  p_email_responsavel text,
  p_inscricao_id uuid DEFAULT NULL,
  p_email_titular text DEFAULT NULL,
  p_versao_termo text DEFAULT '03/11/2026',
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_telefone_responsavel text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_email_titular text;
  v_inscricao public.inscricoes%rowtype;
  v_existente public.consentimentos%rowtype;
  v_id uuid;
  v_token uuid;
  v_expira timestamptz;
  v_email_responsavel text := lower(trim(coalesce(p_email_responsavel, '')));
  v_telefone text := nullif(trim(coalesce(p_telefone_responsavel, '')), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  if v_email_responsavel !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
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

  v_email_titular := lower(trim(coalesce(
    nullif(p_email_titular, ''),
    (select email from auth.users where id = v_uid),
    ''
  )));

  select * into v_existente
  from public.consentimentos c
  where c.tipo = 'menor_responsavel'
    and c.usuario_id = v_uid
    and c.inscricao_id is not distinct from p_inscricao_id
    and c.status in ('pendente', 'aceito')
  order by c.created_at desc
  limit 1;

  if found and v_existente.status = 'aceito' then
    return jsonb_build_object(
      'ok', true,
      'ja_autorizado', true,
      'consentimento_id', v_existente.id,
      'telefone_responsavel', v_existente.telefone_responsavel
    );
  end if;

  if found and v_existente.status = 'pendente' then
    v_expira := now() + interval '7 days';

    update public.consentimentos
    set email_responsavel = v_email_responsavel,
        email_titular = v_email_titular,
        telefone_responsavel = coalesce(v_telefone, v_existente.telefone_responsavel),
        versao_termo = trim(p_versao_termo),
        whatsapp_enviado_em = null,
        expira_em = v_expira,
        ip = nullif(trim(coalesce(p_ip, '')), ''),
        user_agent = nullif(left(coalesce(p_user_agent, ''), 500), ''),
        updated_at = now()
    where id = v_existente.id
    returning id, token into v_id, v_token;

    return jsonb_build_object(
      'ok', true,
      'reenviado', true,
      'consentimento_id', v_id,
      'token', v_token,
      'email_responsavel', v_email_responsavel,
      'telefone_responsavel', v_telefone,
      'expira_em', v_expira
    );
  end if;

  v_expira := now() + interval '7 days';

  insert into public.consentimentos (
    tipo, versao_termo, usuario_id, inscricao_id, email_titular,
    email_responsavel, telefone_responsavel, status, expira_em, ip, user_agent
  ) values (
    'menor_responsavel', trim(p_versao_termo), v_uid, p_inscricao_id,
    v_email_titular, v_email_responsavel, v_telefone, 'pendente', v_expira,
    nullif(trim(coalesce(p_ip, '')), ''),
    nullif(left(coalesce(p_user_agent, ''), 500), '')
  )
  returning id, token into v_id, v_token;

  return jsonb_build_object(
    'ok', true,
    'consentimento_id', v_id,
    'token', v_token,
    'email_responsavel', v_email_responsavel,
    'telefone_responsavel', v_telefone,
    'expira_em', v_expira
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.criar_consentimento_menor(text, uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_consentimento_menor(text, uuid, text, text, text, text, text) TO authenticated, service_role;

-- Subinscrição do aluno (escola): aceita e persiste o telefone do responsável.
DROP FUNCTION IF EXISTS public.entrar_por_link_escola(text, text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.entrar_por_link_escola(
  p_codigo text,
  p_nome text,
  p_email text,
  p_email_responsavel text,
  p_versao_termo text DEFAULT '03/11/2026',
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_telefone_responsavel text DEFAULT NULL
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
  v_telefone text := nullif(trim(coalesce(p_telefone_responsavel, '')), '');
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
    tipo, versao_termo, usuario_id, email_titular, email_responsavel, telefone_responsavel,
    status, expira_em, ip, user_agent
  ) values (
    'menor_responsavel', trim(p_versao_termo), null, v_email, v_responsavel, v_telefone,
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
    'email_responsavel', v_responsavel,
    'telefone_responsavel', v_telefone
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.entrar_por_link_escola(text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrar_por_link_escola(text, text, text, text, text, text, text, text) TO anon, authenticated, service_role;
