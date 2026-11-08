import "server-only";

import { cache as cacheReact } from "react";
import { urlAvatarAssinada } from "@/lib/avatar-assinado";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Usuario = {
  id: string;
  email: string | null;
  nome: string | null;
  avatarUrl: string | null;
  avatarPath: string | null;
};

const MARCADOR_AVATAR_PUBLICO = "/storage/v1/object/public/avatars/";

/**
 * O avatar novo é gravado como caminho (`avatar_path`). Contas antigas ainda
 * têm a URL pública em `avatar_url`; nesse caso o caminho é extraído dela.
 */
function caminhoDoAvatar(metadata: Record<string, unknown>): string | null {
  const caminho = metadata.avatar_path;

  if (typeof caminho === "string" && caminho.trim()) return caminho.trim();

  const url = metadata.avatar_url;

  if (typeof url !== "string") return null;

  const indice = url.indexOf(MARCADOR_AVATAR_PUBLICO);

  if (indice < 0) return null;

  const bruto = decodeURIComponent(
    url.slice(indice + MARCADOR_AVATAR_PUBLICO.length).split("?")[0],
  );

  return bruto || null;
}

export type Perfil = {
  id: string;
  nome_completo: string;
  curso: string | null;
  ano_serie: string | null;
  instituicao: string | null;
  categoria: "aluno" | "externo" | "servidor" | "outro";
  linkedin_url: string | null;
  autoriza_imagem: boolean;
};

export const obterUsuario = cacheReact(async (): Promise<Usuario | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  const avatarPath = caminhoDoAvatar(
    data.user.user_metadata as Record<string, unknown>,
  );

  const avatarUrl = avatarPath
    ? await urlAvatarAssinada(supabase, data.user.id, avatarPath)
    : null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    nome:
      typeof data.user.user_metadata.nome_completo === "string" &&
      data.user.user_metadata.nome_completo.trim()
        ? data.user.user_metadata.nome_completo.trim()
        : null,
    avatarUrl,
    avatarPath,
  };
});

export const obterPerfil = cacheReact(async (): Promise<Perfil | null> => {
  const usuario = await obterUsuario();
  if (!usuario) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("participantes")
    .select(
      "id, nome_completo, curso, ano_serie, instituicao, categoria, linkedin_url, autoriza_imagem",
    )
    .eq("id", usuario.id)
    .maybeSingle();

  if (error || !data) return null;

  return data as Perfil;
});

export const usuarioEhAdmin = cacheReact(async (): Promise<boolean> => {
  const usuario = await obterUsuario();
  if (!usuario) return false;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("eh_admin");

  if (error) return false;

  return data === true;
});

const DOMINIO_ORGANIZADOR = "cps.sp.gov.br";

/**
 * Regra do papel "organizador", espelhando `public.pode_organizar()` no banco:
 * e-mail com domínio exato `cps.sp.gov.br` (o que exclui
 * `aluno.cps.sp.gov.br`). Admin também organiza.
 */
export function emailPodeOrganizar(email: string | null | undefined) {
  if (typeof email !== "string") return false;

  const limpo = email.trim().toLowerCase();
  const separador = limpo.lastIndexOf("@");

  if (separador <= 0 || separador === limpo.length - 1) return false;

  return limpo.slice(separador + 1) === DOMINIO_ORGANIZADOR;
}

export const usuarioPodeOrganizar = cacheReact(async (): Promise<boolean> => {
  if (await usuarioEhAdmin()) return true;

  const usuario = await obterUsuario();

  return emailPodeOrganizar(usuario?.email);
});
