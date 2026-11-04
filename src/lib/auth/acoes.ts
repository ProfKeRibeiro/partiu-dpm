"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CURSOS_DISPONIVEIS } from "@/lib/cursos";
import { destinoSeguroInterno } from "@/lib/rota-segura";
import { senhaVazada } from "@/lib/auth/senha-vazada";
import { emailDeAlunoEtec } from "@/lib/dominios";
import {
  criarConsentimentoMenor,
  registrarAceiteTermos,
} from "@/lib/consentimentos/acoes";
import { garantirConsentimentosIniciais } from "@/lib/consentimentos/garantir";

export type EstadoAuth = { erro?: string; mensagem?: string } | null;

const CATEGORIAS_CADASTRO = ["aluno", "servidor", "externo"] as const;

function emailValido(valor: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
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
  if (
    texto.includes("link is invalid") ||
    texto.includes("has expired") ||
    texto.includes("invalid or has expired")
  ) {
    return "Este link expirou ou já foi usado. Peça um novo link e abra no mesmo navegador.";
  }
  if (texto.includes("auth session missing")) {
    return "Sua sessão expirou. Entre novamente para continuar.";
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
  const destino = destinoSeguroInterno(formData.get("next"));

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

  await garantirConsentimentosIniciais();

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
  const destino = destinoSeguroInterno(formData.get("next"));
  const aceiteTermos = texto(formData, "aceite_termos").toLowerCase();
  const alunoEtec = emailDeAlunoEtec(email);
  const menorIdade =
    !alunoEtec && texto(formData, "menor_idade").toLowerCase() === "true";
  const emailResponsavel = alunoEtec
    ? ""
    : texto(formData, "email_responsavel").toLowerCase();

  if (aceiteTermos !== "true" && aceiteTermos !== "on") {
    return {
      erro: "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.",
    };
  }

  if (menorIdade) {
    if (!emailValido(emailResponsavel)) {
      return {
        erro: "Informe um e-mail válido do responsável para continuar.",
      };
    }

    if (emailResponsavel === email) {
      return {
        erro: "O e-mail do responsável precisa ser diferente do seu.",
      };
    }
  }

  if (nome.length < 3) {
    return { erro: "Informe seu nome completo (mínimo 3 caracteres)." };
  }
  if (!email.includes("@") || email.length < 5) {
    return { erro: "Informe um e-mail válido." };
  }
  if (senha.length < 8) {
    return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  }

  if ((await senhaVazada(senha)) === true) {
    return {
      erro: "Essa senha apareceu em vazamentos conhecidos de dados. Escolha outra, mais difícil de adivinhar.",
    };
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
        aceite_termos_pendente: true,
        menor_idade: menorIdade,
        email_responsavel: menorIdade ? emailResponsavel : null,
      },
      emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(destino)}`,
    },
  });

  if (error) {
    return { erro: traduzirErroAuth(error.message) };
  }

  if (data.session) {
    await registrarAceiteTermos();

    if (menorIdade) {
      const consentimento = new FormData();
      consentimento.append("email_responsavel", emailResponsavel);
      await criarConsentimentoMenor(null, consentimento);
    }

    revalidatePath("/", "layout");
    redirect(destino);
  }

  /* Com a confirmação de e-mail ativa o Supabase não devolve erro para um
   * e-mail já cadastrado: devolve um usuário sem identidades. Sem esta
   * checagem a pessoa veria "conta criada" e ficaria sem caminho de volta. */
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return {
      erro: "Este e-mail já tem conta no Partiu DPM. Entre com sua senha ou use “Esqueci minha senha” para definir uma nova.",
    };
  }

  return {
    mensagem:
      "Conta criada! Enviamos um link de confirmação para o seu e-mail. Ao abrir o link você já entra na sua conta.",
  };
}

/**
 * Recuperação de senha. A resposta é sempre a mesma, exista ou não a conta,
 * para não revelar quais e-mails estão cadastrados.
 */
export async function solicitarRecuperacao(
  _estado: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  if (!isSupabaseConfigured) {
    return {
      erro: "O Supabase ainda não está configurado neste ambiente.",
    };
  }

  const email = texto(formData, "email").toLowerCase();

  if (!email.includes("@") || email.length < 5) {
    return { erro: "Informe o e-mail cadastrado na sua conta." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/redefinir-senha`,
  });

  if (error) {
    return { erro: traduzirErroAuth(error.message) };
  }

  return {
    mensagem:
      "Se este e-mail tiver conta no Partiu DPM, enviamos um link para redefinir a senha. Confira a caixa de entrada e o spam; o link vale por uma hora.",
  };
}

/**
 * Define a nova senha de quem chegou pelo link de recuperação e já tem sessão.
 */
export async function redefinirSenha(
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
    return {
      erro: "O link expirou ou foi aberto em outro navegador. Peça um novo link de recuperação.",
    };
  }

  const senha = texto(formData, "senha");
  const confirmacao = texto(formData, "confirmacao");

  if (senha.length < 8) {
    return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  }

  if (senha !== confirmacao) {
    return { erro: "As senhas informadas não são iguais." };
  }

  if ((await senhaVazada(senha)) === true) {
    return {
      erro: "Essa senha apareceu em vazamentos conhecidos de dados. Escolha outra, mais difícil de adivinhar.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    return { erro: traduzirErroAuth(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/conta");
}

/** Reenvia o e-mail de confirmação para contas que ainda não confirmaram. */
export async function reenviarConfirmacao(
  _estado: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  if (!isSupabaseConfigured) {
    return {
      erro: "O Supabase ainda não está configurado neste ambiente.",
    };
  }

  const email = texto(formData, "email").toLowerCase();

  if (!email.includes("@") || email.length < 5) {
    return { erro: "Informe o e-mail usado no cadastro." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/conta`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already confirmed")) {
      return {
        erro: "Esta conta já está confirmada. Use sua senha para entrar.",
      };
    }

    return { erro: traduzirErroAuth(error.message) };
  }

  return {
    mensagem:
      "Reenviamos o link de confirmação. Confira a caixa de entrada e o spam; o link vale por uma hora.",
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

  if ((await senhaVazada(senha)) === true) {
    return {
      erro: "Essa senha apareceu em vazamentos conhecidos de dados. Escolha outra, mais difícil de adivinhar.",
    };
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
