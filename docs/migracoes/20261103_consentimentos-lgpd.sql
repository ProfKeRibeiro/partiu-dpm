-- Aplicada no Supabase em 03/11/2026.
-- ETAPA 1 — Termos e consentimentos (LGPD).
--
-- Registra aceite dos termos (versão 03/11/2026), consentimento do responsável
-- por menor via link com token e consulta/resposta pública do token.
--
-- Segurança: RLS de leitura (dono ou admin); escrita apenas por RPC
-- SECURITY DEFINER com search_path vazio.

CREATE TABLE IF NOT EXISTS public.consentimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN (
    'termos_uso',
    'comunicacoes',
    'menor_responsavel',
    'sorteio'
  )),
  versao_termo text NOT NULL,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visitante_id uuid,
  inscricao_id uuid REFERENCES public.inscricoes(id) ON DELETE CASCADE,
  email_titular text,
  email_responsavel text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente',
    'aceito',
    'recusado',
    'revogado'
  )),
  aceito_em timestamptz,
  ip text,
  user_agent text,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expira_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consentimentos_menor_email_check CHECK (
    tipo <> 'menor_responsavel' OR email_responsavel IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS consentimentos_termos_usuario_versao_uidx
  ON public.consentimentos (usuario_id, versao_termo)
  WHERE tipo = 'termos_uso' AND usuario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS consentimentos_usuario_idx
  ON public.consentimentos (usuario_id);
CREATE INDEX IF NOT EXISTS consentimentos_inscricao_idx
  ON public.consentimentos (inscricao_id);
CREATE INDEX IF NOT EXISTS consentimentos_status_idx
  ON public.consentimentos (tipo, status);
CREATE INDEX IF NOT EXISTS consentimentos_token_idx
  ON public.consentimentos (token);

DROP TRIGGER IF EXISTS ao_atualizar_consentimentos ON public.consentimentos;
CREATE TRIGGER ao_atualizar_consentimentos
  BEFORE UPDATE ON public.consentimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.definir_updated_at();

ALTER TABLE public.consentimentos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.consentimentos FROM anon, authenticated;
GRANT SELECT ON TABLE public.consentimentos TO authenticated;

DROP POLICY IF EXISTS "Dono ou admin le consentimentos" ON public.consentimentos;
CREATE POLICY "Dono ou admin le consentimentos"
  ON public.consentimentos
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = (SELECT auth.uid())
    OR public.eh_admin()
  );

-- Aceite dos termos -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.registrar_aceite_termos(
  p_versao text,
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
  v_email text;
  v_id uuid;
  v_aceito_em timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  if p_versao is null or char_length(trim(p_versao)) = 0
     or char_length(trim(p_versao)) > 40 then
    return jsonb_build_object('ok', false, 'motivo', 'versao_invalida');
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into public.consentimentos (
    tipo, versao_termo, usuario_id, email_titular, status, aceito_em, ip, user_agent
  ) values (
    'termos_uso', trim(p_versao), v_uid, v_email, 'aceito', now(),
    nullif(trim(coalesce(p_ip, '')), ''),
    nullif(left(coalesce(p_user_agent, ''), 500), '')
  )
  on conflict (usuario_id, versao_termo)
    where tipo = 'termos_uso' and usuario_id is not null
  do update
  set status = 'aceito',
      aceito_em = now(),
      ip = excluded.ip,
      user_agent = excluded.user_agent,
      email_titular = excluded.email_titular,
      updated_at = now()
  returning id, aceito_em into v_id, v_aceito_em;

  return jsonb_build_object(
    'ok', true,
    'consentimento_id', v_id,
    'versao_termo', trim(p_versao),
    'aceito_em', v_aceito_em
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.registrar_aceite_termos(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_aceite_termos(text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.termos_aceitos(p_versao text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.consentimentos c
    where c.tipo = 'termos_uso'
      and c.usuario_id = (select auth.uid())
      and c.versao_termo = trim(coalesce(p_versao, ''))
      and c.status = 'aceito'
  );
$function$;

REVOKE ALL ON FUNCTION public.termos_aceitos(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.termos_aceitos(text) TO authenticated, service_role;

-- Consentimento do responsável por menor --------------------------------------

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
      'consentimento_id', v_existente.id
    );
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
      'ok', true,
      'reenviado', true,
      'consentimento_id', v_id,
      'token', v_token,
      'email_responsavel', v_email_responsavel,
      'expira_em', v_expira
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
    'ok', true,
    'consentimento_id', v_id,
    'token', v_token,
    'email_responsavel', v_email_responsavel,
    'expira_em', v_expira
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.criar_consentimento_menor(text, uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_consentimento_menor(text, uuid, text, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.responder_consentimento(
  p_token uuid,
  p_aceito boolean,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_consentimento public.consentimentos%rowtype;
begin
  select * into v_consentimento
  from public.consentimentos
  where token = p_token
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'token_invalido');
  end if;

  if v_consentimento.status <> 'pendente' then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'ja_respondido',
      'status', v_consentimento.status
    );
  end if;

  if v_consentimento.expira_em is not null and v_consentimento.expira_em < now() then
    return jsonb_build_object('ok', false, 'motivo', 'expirado');
  end if;

  update public.consentimentos
  set status = case when p_aceito then 'aceito' else 'recusado' end,
      aceito_em = case when p_aceito then now() else null end,
      ip = nullif(trim(coalesce(p_ip, '')), ''),
      user_agent = nullif(left(coalesce(p_user_agent, ''), 500), ''),
      updated_at = now()
  where id = v_consentimento.id;

  return jsonb_build_object(
    'ok', true,
    'status', case when p_aceito then 'aceito' else 'recusado' end
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.responder_consentimento(uuid, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_consentimento(uuid, boolean, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consultar_consentimento_menor(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resultado jsonb;
begin
  select jsonb_build_object(
    'status', c.status,
    'expira_em', c.expira_em,
    'expirado', (c.expira_em is not null and c.expira_em < now()),
    'aceito_em', c.aceito_em,
    'nome_titular', p.nome_completo,
    'evento', case
      when e.id is null then null
      else jsonb_build_object(
        'id', e.id,
        'titulo', e.titulo,
        'data_inicio', e.data_inicio
      )
    end
  )
  into v_resultado
  from public.consentimentos c
  left join public.participantes p on p.id = c.usuario_id
  left join public.inscricoes i on i.id = c.inscricao_id
  left join public.eventos e on e.id = i.evento_id
  where c.token = p_token
    and c.tipo = 'menor_responsavel';

  return v_resultado;
end;
$function$;

REVOKE ALL ON FUNCTION public.consultar_consentimento_menor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_consentimento_menor(uuid) TO anon, authenticated, service_role;
