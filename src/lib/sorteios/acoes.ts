"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { enviarEmailConsentimentoMenor } from "@/lib/consentimentos/emails";
import { dadosDaRequisicao } from "@/lib/consentimentos/requisicao";
import { VERSAO_TERMOS } from "@/lib/consentimentos/termos";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EstadoSorteio = {
  ok: boolean;
  mensagem: string;
  sorteioId?: string;
  vencedores?: string[];
} | null;

const MOTIVOS: Record<string, string> = {
  nao_autenticado: "Entre na sua conta para continuar.",
  nao_autorizado: "Você não pode gerenciar este sorteio.",
  sorteio_nao_encontrado: "Sorteio não encontrado.",
  sorteio_encerrado: "Este sorteio não está aberto para cadastro.",
  evento_indisponivel: "O evento não está disponível.",
  nome_invalido: "Informe um nome entre 3 e 120 caracteres.",
  email_invalido: "Informe um e-mail válido.",
  email_responsavel_invalido: "Informe um e-mail válido para o responsável.",
  participante_duplicado: "Este e-mail já está cadastrado neste sorteio.",
  quantidade_invalida: "A quantidade de vencedores deve ficar entre 1 e 100.",
  elegiveis_insuficientes: "Não há participantes elegíveis suficientes para sortear.",
};

function mensagem(motivo: string | undefined) {
  return MOTIVOS[motivo ?? ""] ?? "Não foi possível concluir. Tente novamente.";
}

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function marcado(formData: FormData, campo: string) {
  return ["true", "on", "1"].includes(texto(formData, campo).toLowerCase());
}

/** Cadastro público de visitante no sorteio. */
export async function cadastrarParticipanteSorteio(formData: FormData) {
  const sorteioId = texto(formData, "sorteio_id");

  if (!REGEX_UUID.test(sorteioId)) {
    redirect("/sorteios/invalido");
  }

  const nome = texto(formData, "nome");
  const email = texto(formData, "email");
  const emailResponsavel = texto(formData, "email_responsavel");
  const autorizaComunicacoes = marcado(formData, "autoriza_comunicacoes");
  const { ip, userAgent } = await dadosDaRequisicao();
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase.rpc(
    "cadastrar_participante_sorteio",
    {
      p_sorteio_id: sorteioId,
      p_nome: nome,
      p_email: email,
      p_email_responsavel: emailResponsavel || null,
      p_autoriza_comunicacoes: autorizaComunicacoes,
      p_versao_termo: VERSAO_TERMOS,
      p_ip: ip,
      p_user_agent: userAgent,
    },
  );

  if (error) {
    console.error("[partiu-dpm] Falha no cadastro do sorteio.", error);
    redirect(`/sorteios/${sorteioId}?erro=erro`);
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    motivo?: string;
    token?: string;
    menor?: boolean;
    consentimento_token?: string | null;
    email_responsavel?: string | null;
  };

  if (resultado.ok !== true || !resultado.token) {
    redirect(
      `/sorteios/${sorteioId}?erro=${resultado.motivo ?? "erro"}`,
    );
  }

  if (resultado.menor && resultado.consentimento_token) {
    const { data: consulta } = await supabase.rpc(
      "consultar_resultado_sorteio",
      { p_sorteio_id: sorteioId },
    );
    const eventoTitulo =
      (consulta as { evento?: { titulo?: string } } | null)?.evento?.titulo ??
      null;
    const token = resultado.consentimento_token;
    const para = resultado.email_responsavel ?? emailResponsavel;

    after(() =>
      enviarEmailConsentimentoMenor({
        para,
        nomeTitular: nome,
        eventoTitulo,
        token,
      }),
    );
  }

  redirect(`/sorteios/${sorteioId}?participante=${resultado.token}`);
}

/** Organizador cria um sorteio para o evento. */
export async function criarSorteio(
  _estado: EstadoSorteio,
  formData: FormData,
): Promise<EstadoSorteio> {
  const eventoId = texto(formData, "evento_id");

  if (!REGEX_UUID.test(eventoId)) {
    return { ok: false, mensagem: "Evento inválido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { ok: false, mensagem: mensagem("nao_autenticado") };
  }

  const quantidade = Number(texto(formData, "quantidade_vencedores") || "1");
  const { data, error } = await supabase.rpc("criar_sorteio", {
    p_evento_id: eventoId,
    p_nome: texto(formData, "nome"),
    p_quantidade_vencedores: Number.isInteger(quantidade) ? quantidade : 1,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao criar sorteio.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    motivo?: string;
    sorteio_id?: string;
  };

  if (resultado.ok !== true || !resultado.sorteio_id) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  revalidatePath(`/admin/eventos/${eventoId}`);
  revalidatePath(`/sorteios/${resultado.sorteio_id}`);

  return {
    ok: true,
    mensagem: "Sorteio criado e aberto para cadastro.",
    sorteioId: resultado.sorteio_id,
  };
}

/** Organizador realiza o sorteio (uma única vez). */
export async function realizarSorteio(
  _estado: EstadoSorteio,
  formData: FormData,
): Promise<EstadoSorteio> {
  const sorteioId = texto(formData, "sorteio_id");

  if (!REGEX_UUID.test(sorteioId)) {
    return { ok: false, mensagem: "Sorteio inválido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { ok: false, mensagem: mensagem("nao_autenticado") };
  }

  const { data, error } = await supabase.rpc("realizar_sorteio", {
    p_sorteio_id: sorteioId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao realizar sorteio.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    motivo?: string;
    vencedores?: string[];
  };

  if (resultado.ok !== true) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  revalidatePath(`/sorteios/${sorteioId}`);
  revalidatePath("/admin");

  return {
    ok: true,
    mensagem:
      resultado.vencedores?.length
        ? `Sorteio realizado. Vencedores: ${resultado.vencedores.join(", ")}.`
        : "Sorteio realizado.",
    vencedores: resultado.vencedores ?? [],
  };
}
