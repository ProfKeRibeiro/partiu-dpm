"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { emailConfigurado } from "@/lib/email/enviar";
import { liberarAviso } from "@/lib/email/dedupe";
import { enviarAvisoEvento, type AvisoTipo } from "@/lib/email/avisos";
import { agendarConvite, expirarConvitesEAvisar } from "@/lib/email/promocao";
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
  convite_pendente:
    "Você tem uma vaga reservada. Confirme ou recuse o convite na sua área.",
  confirmado: "Vaga confirmada! Nos vemos no evento.",
  recusado: "Tudo certo. A vaga foi liberada para a próxima pessoa da fila.",
  convite_expirado: "O prazo para confirmar esta vaga expirou.",
  sem_convite: "Este convite não está mais ativo.",
  inscricoes_encerradas: "O período de inscrições foi encerrado.",
  inscricoes_em_breve: "As inscrições ainda não abriram.",
  publico_incompativel:
    "Seu perfil não corresponde ao público-alvo deste evento.",
  curso_incompativel: "Seu curso não está entre os permitidos para este evento.",
  serie_incompativel:
    "Sua série/ano não está entre os permitidos para este evento.",
  evento_indisponivel: "Este evento não está disponível para inscrições.",
  evento_encerrado: "Este evento já foi encerrado.",
  evento_iniciado:
    "Este evento já começou. A vaga da lista de espera não pode mais ser confirmada.",
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

/**
 * Quando a inscrição é recusada por curso ou série, distingue "dado ainda não
 * preenchido" de "dado fora do público do evento": no primeiro caso a pessoa
 * precisa completar o perfil antes de tentar de novo.
 */
async function mensagemIncompativel(
  supabase: ClienteSupabase,
  codigo: string,
  usuarioId: string,
) {
  if (codigo !== "curso_incompativel" && codigo !== "serie_incompativel") {
    return mensagem(codigo);
  }

  const campo = codigo === "curso_incompativel" ? "curso" : "ano_serie";
  const { data } = await supabase
    .from("participantes")
    .select(campo)
    .eq("id", usuarioId)
    .maybeSingle();

  const valor = (data as Record<string, unknown> | null)?.[campo];

  if (typeof valor === "string" && valor.trim()) return mensagem(codigo);

  return codigo === "curso_incompativel"
    ? "Complete seu curso no perfil para se inscrever neste evento."
    : "Complete sua série/ano no perfil para se inscrever neste evento.";
}

function revalidar(eventoId: string | null) {
  revalidatePath("/");
  revalidatePath("/eventos");
  revalidatePath("/conta");

  if (eventoId && REGEX_UUID.test(eventoId)) {
    revalidatePath(`/eventos/${eventoId}`);
  }
}

type ClienteSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Agenda o e-mail de aviso para depois da resposta (não atrasa a inscrição).
 * Busca evento e nome do participante aqui, enquanto a sessão e os cookies
 * ainda estão disponíveis; dentro do `after` só resta o envio.
 */
async function agendarAviso(
  supabase: ClienteSupabase,
  tipo: AvisoTipo,
  inscricaoId: string | null,
  eventoId: string | null,
  usuario: { id: string; email?: string | null },
) {
  if (!emailConfigurado() || !usuario.email || !eventoId || !inscricaoId) return;

  /* Evita e-mail repetido quando a pessoa atualiza a página ou repete a
   * operação: a RPC só registra o aviso se não houve outro igual nos últimos
   * 5 minutos. */
  const { data: avisoId, error: erroAviso } = await supabase.rpc(
    "registrar_aviso_email",
    {
      p_inscricao_id: inscricaoId,
      p_tipo: tipo,
      p_janela_segundos: 300,
    },
  );

  if (erroAviso) {
    console.warn(
      "[partiu-dpm] Falha ao registrar aviso de e-mail:",
      erroAviso.message,
    );
    return;
  }

  if (!avisoId) return;

  const [{ data: evento }, { data: participante }] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, titulo, tipo, modalidade, local_evento, data_inicio, data_fim")
      .eq("id", eventoId)
      .maybeSingle(),
    supabase
      .from("participantes")
      .select("nome_completo")
      .eq("id", usuario.id)
      .maybeSingle(),
  ]);

  if (!evento) {
    console.warn("[partiu-dpm] Evento não encontrado para o e-mail de aviso.");
    await liberarAviso(avisoId as string);
    return;
  }

  const para = usuario.email;
  const nome = participante?.nome_completo?.trim() || "";

  let posicao: number | null = null;

  if (tipo === "lista_espera") {
    const { data } = await supabase.rpc("posicao_lista_espera", {
      p_inscricao_id: inscricaoId,
    });

    posicao = typeof data === "number" ? data : null;
  }

  after(async () => {
    const resultado = await enviarAvisoEvento({
      tipo,
      dados: {
        nome,
        email: para,
        posicao,
        evento: {
          id: evento.id as string,
          titulo: evento.titulo as string,
          tipo: evento.tipo as string,
          modalidade: evento.modalidade as string,
          local: (evento.local_evento as string | null) ?? null,
          inicio: (evento.data_inicio as string | null) ?? null,
          fim: (evento.data_fim as string | null) ?? null,
        },
      },
    });

    if (!resultado.ok && resultado.motivo === "falha") {
      await liberarAviso(avisoId as string);
    }
  });
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

  await expirarConvitesEAvisar(supabase);

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

  if (resultado.ok === true && codigo === "inscrito") {
    await agendarAviso(
      supabase,
      "inscrito",
      resultado.inscricao_id ?? null,
      eventoId,
      userData.user,
    );
  }

  if (resultado.ok === true && codigo === "lista_espera") {
    await agendarAviso(
      supabase,
      "lista_espera",
      resultado.inscricao_id ?? null,
      eventoId,
      userData.user,
    );
  }

  revalidar(eventoId);

  const textoFinal =
    resultado.ok === true && codigo === "lista_espera"
      ? "Você entrou na lista de espera. Avisaremos se uma vaga for liberada."
      : await mensagemIncompativel(supabase, codigo, userData.user.id);

  return {
    ok: resultado.ok === true,
    codigo,
    mensagem: textoFinal,
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

  await expirarConvitesEAvisar(supabase);

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

  const resultado = (data ?? {}) as {
    ok?: boolean;
    codigo?: string;
    convocado?: boolean;
    convocado_inscricao_id?: string | null;
    convite_expira_em?: string | null;
  };
  const codigo = resultado.codigo ?? "erro";

  if (resultado.ok === true && codigo === "cancelada") {
    let eventoDaInscricao = eventoId;

    if (!eventoDaInscricao) {
      const { data: inscricao } = await supabase
        .from("inscricoes")
        .select("evento_id")
        .eq("id", inscricaoId)
        .maybeSingle();

      eventoDaInscricao = (inscricao?.evento_id as string | undefined) ?? null;
    }

    await agendarAviso(
      supabase,
      "cancelado",
      inscricaoId,
      eventoDaInscricao,
      userData.user,
    );

    if (resultado.convocado === true && resultado.convocado_inscricao_id) {
      await agendarConvite(
        resultado.convocado_inscricao_id,
        resultado.convite_expira_em ?? null,
      );
    }
  }

  revalidar(eventoId);

  return {
    ok: resultado.ok === true,
    codigo,
    mensagem: mensagem(codigo),
  };
}

/**
 * Resposta a um convite de vaga (lista de espera). Aceitar confirma a
 * inscrição; recusar libera a vaga para a próxima pessoa da fila.
 */
export async function responderConvite(
  _estado: EstadoInscricao,
  formData: FormData,
): Promise<EstadoInscricao> {
  const inscricaoId = texto(formData, "inscricao_id");
  const eventoId = texto(formData, "evento_id") || null;
  const aceitar = texto(formData, "aceitar") === "true";

  if (!REGEX_UUID.test(inscricaoId)) {
    return { ok: false, codigo: "invalido", mensagem: "Convite inválido." };
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

  await expirarConvitesEAvisar(supabase);

  const { data, error } = await supabase.rpc("responder_convite", {
    p_inscricao_id: inscricaoId,
    p_aceitar: aceitar,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao responder convite.", error);
    return {
      ok: false,
      codigo: "erro",
      mensagem: "Não foi possível responder agora. Tente novamente.",
    };
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    codigo?: string;
    proximo?: {
      convocado?: boolean;
      inscricao_id?: string | null;
      expira_em?: string | null;
    } | null;
  };
  const codigo = resultado.codigo ?? "erro";

  if (resultado.proximo?.convocado === true && resultado.proximo.inscricao_id) {
    await agendarConvite(
      resultado.proximo.inscricao_id,
      resultado.proximo.expira_em ?? null,
    );
  }

  revalidar(eventoId);

  return {
    ok: resultado.ok === true,
    codigo,
    mensagem: mensagem(codigo),
  };
}
