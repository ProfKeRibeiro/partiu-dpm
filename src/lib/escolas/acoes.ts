"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { dadosDaRequisicao } from "@/lib/consentimentos/requisicao";
import { VERSAO_TERMOS } from "@/lib/consentimentos/termos";
import { enviarEmailConsentimentoMenor } from "@/lib/consentimentos/emails";
import { whatsappValido } from "@/lib/whatsapp";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EstadoEscola = {
  ok: boolean;
  mensagem: string;
  codigo?: string;
  escolaId?: string;
} | null;

const MOTIVOS: Record<string, string> = {
  nao_autenticado: "Entre na sua conta para continuar.",
  apenas_cps: "Apenas professores/coordenadores com e-mail @cps.sp.gov.br podem inscrever escolas.",
  evento_nao_encontrado: "Evento não encontrado.",
  inscricoes_encerradas: "As inscrições deste evento estão encerradas.",
  escola_nome_invalido: "Informe o nome da escola (3 a 120 caracteres).",
  responsavel_nome_invalido: "Informe o nome do responsável (3 a 80 caracteres).",
  codigo_invalido: "Código de subinscrição inválido.",
  nome_invalido: "Informe o nome do aluno (3 a 120 caracteres).",
  email_invalido: "Informe um e-mail válido para o aluno.",
  email_responsavel_invalido: "Informe um e-mail válido para o responsável.",
  aluno_duplicado: "Este aluno já está inscrito neste evento.",
  aluno_nao_encontrado: "Aluno não encontrado.",
};

function mensagem(motivo: string | undefined) {
  return MOTIVOS[motivo ?? ""] ?? "Não foi possível concluir. Tente novamente.";
}

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

/** Professor/coordenador @cps cria a inscrição da escola e recebe o código. */
export async function criarInscricaoEscola(
  _estado: EstadoEscola,
  formData: FormData,
): Promise<EstadoEscola> {
  const eventoId = texto(formData, "evento_id");

  if (!REGEX_UUID.test(eventoId)) {
    return { ok: false, mensagem: "Evento inválido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { ok: false, mensagem: mensagem("nao_autenticado") };
  }

  const { data, error } = await supabase.rpc("criar_inscricao_escola", {
    p_evento_id: eventoId,
    p_escola_nome: texto(formData, "escola_nome"),
    p_responsavel_nome: texto(formData, "responsavel_nome"),
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao criar inscrição de escola.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    motivo?: string;
    codigo?: string;
    escola_inscricao_id?: string;
  };

  if (resultado.ok !== true || !resultado.codigo) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/eventos/${eventoId}`);

  return {
    ok: true,
    mensagem: "Escola inscrita. Compartilhe o código de subinscrição com os alunos.",
    codigo: resultado.codigo,
    escolaId: resultado.escola_inscricao_id,
  };
}

/**
 * Aluno entra pelo código da escola.
 *
 * Não exige conta: o aluno informa nome/e-mail e o e-mail do responsável. O
 * consentimento fica pendente até o aceite no link enviado ao responsável.
 * O WhatsApp do responsável é opcional e prepara o envio do link por lá.
 */
export async function inscreverAlunoEscola(formData: FormData) {
  const codigo = texto(formData, "codigo");
  const nome = texto(formData, "nome");
  const email = texto(formData, "email");
  const emailResponsavel = texto(formData, "email_responsavel");
  const telefoneResponsavel = texto(formData, "telefone_responsavel");

  if (!codigo) {
    redirect("/escolas/invalido");
  }

  if (telefoneResponsavel && !whatsappValido(telefoneResponsavel)) {
    redirect(`/escolas/${encodeURIComponent(codigo)}?erro=telefone_invalido`);
  }

  const { ip, userAgent } = await dadosDaRequisicao();
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("entrar_por_link_escola", {
    p_codigo: codigo,
    p_nome: nome,
    p_email: email,
    p_email_responsavel: emailResponsavel,
    p_telefone_responsavel: telefoneResponsavel || null,
    p_versao_termo: VERSAO_TERMOS,
    p_ip: ip,
    p_user_agent: userAgent,
  });

  if (error) {
    console.error("[partiu-dpm] Falha na subinscrição da escola.", error);
    redirect(`/escolas/${encodeURIComponent(codigo)}?erro=erro`);
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    motivo?: string;
    token?: string;
    autorizado?: boolean;
    interno?: boolean;
    email_responsavel?: string;
    telefone_responsavel?: string | null;
    consentimento_id?: string | null;
  };

  if (resultado.ok !== true || !resultado.token) {
    const motivo = resultado.motivo ?? "erro";
    redirect(`/escolas/${encodeURIComponent(codigo)}?erro=${motivo}`);
  }

  if (resultado.autorizado === true) {
    redirect(`/escolas/${encodeURIComponent(codigo)}?aluno=autorizado`);
  }

  const { data: consulta } = await supabase.rpc(
    "consultar_escola_por_codigo",
    { p_codigo: codigo },
  );
  const eventoTitulo =
    (consulta as { evento?: { titulo?: string } } | null)?.evento?.titulo ??
    null;

  const token = resultado.token;
  const para = resultado.email_responsavel ?? emailResponsavel;

  after(() =>
    enviarEmailConsentimentoMenor({
      para,
      nomeTitular: nome,
      eventoTitulo,
      token,
      telefoneResponsavel:
        resultado.telefone_responsavel ?? telefoneResponsavel ?? null,
      consentimentoId: resultado.consentimento_id ?? null,
    }),
  );

  redirect(`/escolas/${encodeURIComponent(codigo)}?aluno=pendente`);
}
