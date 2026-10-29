"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CURSOS_DISPONIVEIS } from "@/lib/cursos";

export type EstadoAuth = { erro?: string; mensagem?: string } | null;

const CATEGORIAS_CADASTRO = ["aluno", "servidor", "externo"] as const;

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Só aceita caminhos internos. Evita open redirect via `?next=`.
 */
function destinoSeguro(valor: FormDataEntryValue | null) {
  const texto = typeof valor === "string" ? valor.trim() : "";

  if (!texto.startsWith("/") || texto.startsWith("//")) return "/conta";
  if (texto.startsWith("/entrar")) return "/conta";

  return texto;
}

function traduzirErroAuth(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (texto.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }
  if (texto.includes("user already registered")) {
    return "Este e-mail já possui conta. Entre com sua senha.";
  }
  if (texto.includes("password should be at least")) {
    return "A senha não atende ao tamanho mínimo exigido.";
  }
  if (
    texto.includes("rate limit") ||
    texto.includes("too many") ||
    texto.includes("after 60 seconds")
  ) {
    return "Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.";
  }
  if (texto.includes("unable to validate email")) {
    return "E-mail inválido. Confira e tente novamente.";
  }
  if (texto.includes("signups not allowed")) {
    return "O cadastro está desativado no momento. Procure a organização.";
  }

  return "Não foi possível concluir agora. Tente novamente em alguns instantes.";
}

export async function entrar(
  _estado: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  if (!isSupabaseConfigured) {
    return {
      erro: "O Supabase ainda não está configurado neste ambiente.",
    };
  }

  const email = texto(formData, "email").toLowerCase();
  const senha = texto(formData, "senha");
  const destino = destinoSeguro(formData.get("next"));

  if (!email || !senha) {
    return { erro: "Informe e-mail e senha." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { erro: traduzirErroAuth(error.message) };
  }

  revalidatePath("/", "layout");
  redirect(destino);
}

export async function criarConta(
  _estado: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  if (!isSupabaseConfigured) {
    return {
      erro: "O Supabase ainda não está configurado neste ambiente.",
    };
  }

  const nome = texto(formData, "nome");
  const email = texto(formData, "email").toLowerCase();
  const senha = texto(formData, "senha");
  const categoria = texto(formData, "categoria");
  const curso = texto(formData, "curso");
  const destino = destinoSeguro(formData.get("next"));

  if (nome.length < 3) {
    return { erro: "Informe seu nome completo (mínimo 3 caracteres)." };
  }
  if (!email.includes("@") || email.length < 5) {
    return { erro: "Informe um e-mail válido." };
  }
  if (senha.length < 8) {
    return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  }
  if (
    !CATEGORIAS_CADASTRO.includes(
      categoria as (typeof CATEGORIAS_CADASTRO)[number],
    )
  ) {
    return { erro: "Selecione se você é aluno, professor/funcionário ou externo." };
  }
  if (
    categoria === "aluno" &&
    !CURSOS_DISPONIVEIS.some((opcao) => opcao.valor === curso)
  ) {
    return { erro: "Selecione um curso válido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        nome_completo: nome,
        categoria,
        curso: categoria === "aluno" ? curso : null,
      },
      emailRedirectTo: `${siteUrl}/entrar`,
    },
  });

  if (error) {
    return { erro: traduzirErroAuth(error.message) };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(destino === "/conta" ? "/conta" : destino);
  }

  return {
    mensagem:
      "Conta criada! Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, volte e entre.",
  };
}

export async function sair() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function atualizarPerfil(
  _estado: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  if (!isSupabaseConfigured) {
    return {
      erro: "O Supabase ainda não está configurado neste ambiente.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { erro: "Sua sessão expirou. Entre novamente." };
  }

  const nome = texto(formData, "nome_completo");
  const curso = texto(formData, "curso");
  const anoSerie = texto(formData, "ano_serie");
  const instituicao = texto(formData, "instituicao");
  const linkedin = texto(formData, "linkedin_url");

  if (nome.length < 3) {
    return { erro: "Informe seu nome completo (mínimo 3 caracteres)." };
  }
  if (nome.length > 120) {
    return { erro: "O nome pode ter no máximo 120 caracteres." };
  }

  if (linkedin) {
    try {
      const url = new URL(linkedin);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("protocolo inválido");
      }
    } catch {
      return {
        erro: "O LinkedIn deve ser um link completo, começando com https://.",
      };
    }
  }

  const { data, error } = await supabase.rpc("atualizar_perfil_participante", {
    p_nome_completo: nome,
    p_curso: curso || null,
    p_ano_serie: anoSerie || null,
    p_instituicao: instituicao || null,
    p_linkedin_url: linkedin || null,
  });

  if (error) {
    return { erro: "Não foi possível salvar o perfil. Tente novamente." };
  }

  const resultado = (data ?? {}) as { ok?: boolean; codigo?: string };

  if (resultado.ok !== true) {
    const mensagens: Record<string, string> = {
      nao_autenticado: "Sua sessão expirou. Entre novamente.",
      nome_invalido: "Informe seu nome completo (3 a 120 caracteres).",
      curso_invalido: "O curso pode ter no máximo 120 caracteres.",
      serie_invalida: "A série/ano pode ter no máximo 40 caracteres.",
      instituicao_invalida: "A instituição pode ter no máximo 160 caracteres.",
      linkedin_invalido:
        "O LinkedIn deve ser um link completo começando com https://.",
    };

    return {
      erro:
        mensagens[resultado.codigo ?? ""] ??
        "Não foi possível salvar o perfil. Tente novamente.",
    };
  }

  revalidatePath("/conta", "layout");
  revalidatePath("/", "layout");

  return { mensagem: "Perfil atualizado com sucesso." };
}

/**
 * Alteração de senha para quem já está autenticado.
 *
 * `updateUser` usa a sessão atual do Supabase; não é necessário enviar a senha
 * antiga. A confirmação dupla evita erro de digitação e a sessão segue ativa.
 */
export async function alterarSenha(
  _estado: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  if (!isSupabaseConfigured) {
    return {
      erro: "O Supabase ainda não está configurado neste ambiente.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { erro: "Sua sessão expirou. Entre novamente." };
  }

  const senha = texto(formData, "senha");
  const confirmacao = texto(formData, "confirmacao");

  if (senha.length < 8) {
    return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  }

  if (senha !== confirmacao) {
    return { erro: "As senhas informadas não são iguais." };
  }

  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    return { erro: traduzirErroAuth(error.message) };
  }

  return {
    mensagem:
      "Senha alterada. Use a nova senha na próxima vez que entrar no portal.",
  };
}
