"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EstadoInscricao = {
  ok: boolean;
  codigo: string;
  mensagem: string;
  inscricaoId?: string | null;
} | null;

const MENSAGENS: Record<string, string> = {
  inscrito: "Inscrição confirmada! Nos vemos no evento.",
  cancelada: "Inscrição cancelada. A vaga foi liberada.",
  ja_cancelada: "Esta inscrição já estava cancelada.",
  duplicado: "Você já está inscrito neste evento.",
  lotado: "As vagas deste evento acabaram.",
  lista_espera: "Você já está na lista de espera deste evento.",
  inscricoes_encerradas: "O período de inscrições foi encerrado.",
  inscricoes_em_breve: "As inscrições ainda não abriram.",
  publico_incompativel:
    "Seu perfil não corresponde ao público-alvo deste evento.",
  curso_incompativel: "Seu curso não está entre os permitidos para este evento.",
  serie_incompativel:
    "Sua série/ano não está entre os permitidos para este evento.",
  evento_indisponivel: "Este evento não está disponível para inscrições.",
  evento_encerrado: "Este evento já foi encerrado.",
  evento_nao_encontrado: "Evento não encontrado.",
  perfil_nao_encontrado:
    "Seu perfil de participante ainda não existe. Atualize seus dados e tente novamente.",
  nao_autenticado: "Entre na sua conta para continuar.",
  nao_encontrado: "Inscrição não encontrada.",
  cancelamento_encerrado:
    "O cancelamento não é mais permitido: o evento já começou.",
};

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function mensagem(codigo: string) {
  return MENSAGENS[codigo] ?? "Não foi possível concluir. Tente novamente.";
}

function revalidar(eventoId: string | null) {
  revalidatePath("/");
  revalidatePath("/eventos");
  revalidatePath("/conta");

  if (eventoId && REGEX_UUID.test(eventoId)) {
    revalidatePath(`/eventos/${eventoId}`);
  }
}

export async function inscreverEmEvento(
  _estado: EstadoInscricao,
  formData: FormData,
): Promise<EstadoInscricao> {
  const eventoId = texto(formData, "evento_id");

  if (!REGEX_UUID.test(eventoId)) {
    return { ok: false, codigo: "invalido", mensagem: "Evento inválido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return {
      ok: false,
      codigo: "nao_autenticado",
      mensagem: mensagem("nao_autenticado"),
    };
  }

  const { data, error } = await supabase.rpc("inscrever_em_evento", {
    p_evento_id: eventoId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao inscrever.", error);
    if (error.message.includes("publico_incompativel")) {
      return {
        ok: false,
        codigo: "publico_incompativel",
        mensagem: mensagem("publico_incompativel"),
      };
    }
    return {
      ok: false,
      codigo: "erro",
      mensagem: "Não foi possível concluir a inscrição. Tente novamente.",
    };
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    codigo?: string;
    inscricao_id?: string;
  };
  const codigo = resultado.codigo ?? "erro";

  revalidar(eventoId);

  return {
    ok: resultado.ok === true,
    codigo,
    mensagem: mensagem(codigo),
    inscricaoId: resultado.inscricao_id ?? null,
  };
}

export async function cancelarInscricao(
  _estado: EstadoInscricao,
  formData: FormData,
): Promise<EstadoInscricao> {
  const inscricaoId = texto(formData, "inscricao_id");
  const eventoId = texto(formData, "evento_id") || null;

  if (!REGEX_UUID.test(inscricaoId)) {
    return { ok: false, codigo: "invalido", mensagem: "Inscrição inválida." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return {
      ok: false,
      codigo: "nao_autenticado",
      mensagem: mensagem("nao_autenticado"),
    };
  }

  const { data, error } = await supabase.rpc("cancelar_inscricao", {
    p_inscricao_id: inscricaoId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao cancelar inscrição.", error);
    return {
      ok: false,
      codigo: "erro",
      mensagem: "Não foi possível cancelar agora. Tente novamente.",
    };
  }

  const resultado = (data ?? {}) as { ok?: boolean; codigo?: string };
  const codigo = resultado.codigo ?? "erro";

  revalidar(eventoId);

  return {
    ok: resultado.ok === true,
    codigo,
    mensagem: mensagem(codigo),
  };
}
