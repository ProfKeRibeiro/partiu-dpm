import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Usuario = {
  id: string;
  email: string | null;
  nome: string | null;
  avatarUrl: string | null;
};

export type Perfil = {
  id: string;
  nome_completo: string;
  curso: string | null;
  ano_serie: string | null;
  instituicao: string | null;
  categoria: "aluno" | "externo" | "servidor" | "outro";
  linkedin_url: string | null;
};

export const obterUsuario = cache(async (): Promise<Usuario | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    nome:
      typeof data.user.user_metadata.nome_completo === "string" &&
      data.user.user_metadata.nome_completo.trim()
        ? data.user.user_metadata.nome_completo.trim()
        : null,
    avatarUrl:
      typeof data.user.user_metadata.avatar_url === "string"
        ? data.user.user_metadata.avatar_url
        : null,
  };
});

export const obterPerfil = cache(async (): Promise<Perfil | null> => {
  const usuario = await obterUsuario();
  if (!usuario) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("participantes")
    .select(
      "id, nome_completo, curso, ano_serie, instituicao, categoria, linkedin_url",
    )
    .eq("id", usuario.id)
    .maybeSingle();

  if (error || !data) return null;

  return data as Perfil;
});

export const usuarioEhAdmin = cache(async (): Promise<boolean> => {
  const usuario = await obterUsuario();
  if (!usuario) return false;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("eh_admin");

  if (error) return false;

  return data === true;
});
