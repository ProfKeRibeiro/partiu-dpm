"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { enviarEmailConsentimentoMenor, enviarEmailReaceiteTermos } from "@/lib/consentimentos/emails";
import { dadosDaRequisicao } from "@/lib/consentimentos/requisicao";
import { VERSAO_TERMOS } from "@/lib/consentimentos/termos";
import { whatsappValido } from "@/lib/whatsapp";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EstadoConsentimento = {
  ok: boolean;
  mensagem: string;
} | null;

/**
 * Campanha de re-aceite dos termos (admin).
 *
 * A RPC cria a notificação no sino e a linha de controle por usuário/versão de
 * forma idempotente; a action envia o e-mail apenas para os usuários retornados
 * na primeira execução. Rodar de novo não repete nem notificação nem e-mail.
 */
export async function campanhaReaceiteTermos(): Promise<EstadoConsentimento> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { ok: false, mensagem: mensagem("nao_autenticado") };
  }

  const { data, error } = await supabase.rpc("admin_campanha_reaceite_termos", {
    p_versao: VERSAO_TERMOS,
  });

  if (error) {
    console.error("[partiu-dpm] Falha na campanha de re-aceite.", error);
    return {
      ok: false,
      mensagem:
        error.code === "42501"
          ? "Apenas administradores podem disparar a campanha."
          : mensagem(undefined),
    };
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    motivo?: string;
    novos?: number;
    usuarios?: Array<{ usuario_id?: string; nome?: string; email?: string }>;
  };

  if (resultado.ok !== true) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  let enviados = 0;

  for (const usuario of resultado.usuarios ?? []) {
    if (!usuario.email) continue;

    await enviarEmailReaceiteTermos({
      para: usuario.email,
      nome: usuario.nome?.trim() || usuario.email.split("@")[0],
      versao: VERSAO_TERMOS,
    });
    enviados += 1;
  }

  revalidatePath("/admin");

  return {
    ok: true,
    mensagem: enviados
      ? `Campanha enviada para ${enviados} usuário(s).`
      : "Nenhum usuário pendente de aceite nesta versão.",
  };
}

const MOTIVOS: Record<string, string> = {
  nao_autenticado: "Entre na sua conta para continuar.",
  versao_invalida: "Versão dos termos inválida.",
  email_responsavel_invalido: "Informe um e-mail válido para o responsável.",
  inscricao_nao_encontrada: "Inscrição não encontrada.",
  nao_autorizado: "Você não pode solicitar consentimento para esta inscrição.",
  token_invalido: "Link inválido.",
  ja_respondido: "Este link já foi respondido.",
  expirado: "Este link expirou. Peça um novo à pessoa responsável pelo cadastro.",
  telefone_invalido: "Informe um WhatsApp válido no formato (DD) 9XXXX-XXXX.",
};

function mensagem(motivo: string | undefined) {
  return MOTIVOS[motivo ?? ""] ?? "Não foi possível concluir. Tente novamente.";
}

/**
 * Registra o aceite dos termos para o usuário logado.
 *
 * Ponto de integração do cadastro/login: chamar depois de criar a conta (ou no
 * primeiro login) com a versão vigente. O IP e o user agent são capturados aqui
 * e gravados no registro.
 */
export async function registrarAceiteTermos(
  versao: string = VERSAO_TERMOS,
): Promise<EstadoConsentimento> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { ok: false, mensagem: mensagem("nao_autenticado") };
  }

  const { ip, userAgent } = await dadosDaRequisicao();
  const { data, error } = await supabase.rpc("registrar_aceite_termos", {
    p_versao: versao,
    p_ip: ip,
    p_user_agent: userAgent,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao registrar aceite dos termos.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as { ok?: boolean; motivo?: string };

  if (resultado.ok !== true) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  revalidatePath("/conta");
  revalidatePath("/conta/perfil");

  return { ok: true, mensagem: "Aceite dos termos registrado." };
}

/**
 * Ação de formulário do banner de re-aceite (`useActionState`).
 */
export async function aceitarTermosAction(): Promise<EstadoConsentimento> {
  const resultado = await registrarAceiteTermos();

  revalidatePath("/conta");
  revalidatePath("/conta/perfil");
  revalidatePath("/admin");

  return resultado;
}

/** Verifica se o usuário logado aceitou a versão vigente dos termos. */
export async function verificarAceiteTermos(
  versao: string = VERSAO_TERMOS,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("termos_aceitos", {
    p_versao: versao,
  });

  if (error) return false;

  return data === true;
}

/**
 * Cria (ou reenvia) o consentimento do responsável por um menor.
 *
 * Campos do formulário: `inscricao_id` (opcional) e `email_responsavel`.
 */
export async function criarConsentimentoMenor(
  _estado: EstadoConsentimento,
  formData: FormData,
): Promise<EstadoConsentimento> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { ok: false, mensagem: mensagem("nao_autenticado") };
  }

  const inscricaoId = String(formData.get("inscricao_id") ?? "").trim();
  const emailResponsavel = String(
    formData.get("email_responsavel") ?? "",
  ).trim();
  const telefoneResponsavel =
    String(formData.get("telefone_responsavel") ?? "").trim() || null;

  if (telefoneResponsavel && !whatsappValido(telefoneResponsavel)) {
    return { ok: false, mensagem: mensagem("telefone_invalido") };
  }

  if (inscricaoId && !REGEX_UUID.test(inscricaoId)) {
    return { ok: false, mensagem: "Inscrição inválida." };
  }

  if (telefoneResponsavel && !whatsappValido(telefoneResponsavel)) {
    return { ok: false, mensagem: mensagem("telefone_invalido") };
  }

  const { ip, userAgent } = await dadosDaRequisicao();
  const { data, error } = await supabase.rpc("criar_consentimento_menor", {
    p_email_responsavel: emailResponsavel,
    p_inscricao_id: inscricaoId || null,
    p_versao_termo: VERSAO_TERMOS,
    p_ip: ip,
    p_user_agent: userAgent,
    p_telefone_responsavel: telefoneResponsavel,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao criar consentimento de menor.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    motivo?: string;
    token?: string;
    email_responsavel?: string;
    ja_autorizado?: boolean;
    consentimento_id?: string | null;
    telefone_responsavel?: string | null;
  };

  if (resultado.ok !== true) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  if (resultado.ja_autorizado === true) {
    return {
      ok: true,
      mensagem: "Este cadastro já está autorizado pelo responsável.",
    };
  }

  if (!resultado.token || !resultado.email_responsavel) {
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const token = resultado.token;
  const para = resultado.email_responsavel;
  let nomeTitular = userData.user.user_metadata?.nome_completo as
    | string
    | undefined;
  let eventoTitulo: string | null = null;

  if (inscricaoId) {
    const { data: inscricao } = await supabase
      .from("inscricoes")
      .select("eventos (titulo), participantes (nome_completo)")
      .eq("id", inscricaoId)
      .maybeSingle();

    const evento = inscricao?.eventos as { titulo?: string } | null;
    const participante = inscricao?.participantes as
      | { nome_completo?: string }
      | null;

    eventoTitulo = evento?.titulo ?? null;
    nomeTitular = participante?.nome_completo ?? nomeTitular;
  }

  const nome = nomeTitular?.trim() || "o participante";
  const evento = eventoTitulo;

  after(() =>
    enviarEmailConsentimentoMenor({
      para,
      nomeTitular: nome,
      eventoTitulo: evento,
      token,
    }),
  );

  revalidatePath("/conta/inscricoes");

  return {
    ok: true,
    mensagem:
      "Enviamos o link de autorização para o e-mail do responsável. A inscrição fica aguardando a resposta.",
  };
}

/**
 * Resposta pública do responsável pelo link do e-mail.
 *
 * Não exige sessão: o token é a credencial. Campos: `token` e `decisao`
 * (`aceitar`/`recusar`).
 */
export async function responderConsentimento(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const decisao = String(formData.get("decisao") ?? "").trim();

  if (!REGEX_UUID.test(token)) {
    redirect("/consentimento/invalido");
  }

  const { ip, userAgent } = await dadosDaRequisicao();
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("responder_consentimento", {
    p_token: token,
    p_aceito: decisao === "aceitar",
    p_ip: ip,
    p_user_agent: userAgent,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao responder consentimento.", error);
    redirect(`/consentimento/${token}?resposta=erro`);
  }

  const resultado = (data ?? {}) as { ok?: boolean; status?: string };

  if (resultado.ok !== true) {
    redirect(`/consentimento/${token}?resposta=invalido`);
  }

  redirect(
    `/consentimento/${token}?resposta=${resultado.status ?? "aceito"}`,
  );
}
