"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  enviarConviteEquipe,
  enviarEntradaEquipe,
  enviarEquipeConfirmada,
} from "@/lib/equipes/emails";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EstadoEquipe = {
  ok: boolean;
  mensagem: string;
  codigo?: string;
  equipeId?: string;
} | null;

const MOTIVOS: Record<string, string> = {
  nao_autenticado: "Entre na sua conta para continuar.",
  apenas_alunos: "Apenas alunos podem participar de equipes.",
  evento_nao_encontrado: "Evento não encontrado.",
  evento_sem_equipes: "Este evento não aceita equipes.",
  inscricoes_encerradas: "As inscrições deste evento estão encerradas.",
  nome_invalido: "O nome da equipe deve ter entre 3 e 80 caracteres.",
  orientador_obrigatorio: "Informe o nome do professor orientador.",
  orientador_email_invalido: "Informe um e-mail válido para o orientador.",
  ja_em_equipe: "Você já está em uma equipe deste evento.",
  equipe_nao_encontrada: "Equipe não encontrada.",
  equipe_cancelada: "Esta equipe foi cancelada.",
  equipe_cheia: "A equipe já está completa.",
  nao_e_membro: "Você não faz parte desta equipe.",
  apenas_lider: "Apenas o líder pode fazer esta ação.",
  lider_transferir_ou_cancelar:
    "O líder não pode sair sem transferir a liderança ou cancelar a equipe.",
  novo_lider_nao_e_membro: "Escolha um membro da própria equipe como novo líder.",
};

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function mensagem(motivo: string | undefined) {
  return MOTIVOS[motivo ?? ""] ?? "Não foi possível concluir. Tente novamente.";
}

function revalidar() {
  revalidatePath("/conta");
  revalidatePath("/conta/inscricoes");
  revalidatePath("/eventos");
  revalidatePath("/admin");
}

export async function criarEquipe(
  _estado: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const eventoId = texto(formData, "evento_id");

  if (!REGEX_UUID.test(eventoId)) {
    return { ok: false, mensagem: "Evento inválido." };
  }

  const orientadorEmail = texto(formData, "orientador_email").toLowerCase();

  if (orientadorEmail && !/^[^@\s]+@cps\.sp\.gov\.br$/.test(orientadorEmail)) {
    return {
      ok: false,
      mensagem:
        "O orientador precisa ser professor com e-mail institucional @cps.sp.gov.br.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { ok: false, mensagem: mensagem("nao_autenticado") };
  }

  const { data, error } = await supabase.rpc("criar_equipe", {
    p_evento_id: eventoId,
    p_nome: texto(formData, "nome"),
    p_orientador_nome: texto(formData, "orientador_nome") || null,
    p_orientador_email: orientadorEmail || null,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao criar equipe.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    motivo?: string;
    equipe_id?: string;
    codigo_convite?: string;
  };

  if (resultado.ok !== true || !resultado.equipe_id) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  const equipeId = resultado.equipe_id;

  after(() => enviarConviteEquipe(equipeId));

  revalidar();
  revalidatePath(`/eventos/${eventoId}`);

  return {
    ok: true,
    mensagem: "Equipe criada! Compartilhe o código com seus colegas.",
    codigo: resultado.codigo_convite,
    equipeId,
  };
}

export async function entrarEquipe(
  _estado: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const codigo = texto(formData, "codigo");

  if (!codigo) {
    return { ok: false, mensagem: "Informe o código da equipe." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { ok: false, mensagem: mensagem("nao_autenticado") };
  }

  const { data, error } = await supabase.rpc("entrar_equipe", {
    p_codigo: codigo,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao entrar na equipe.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as {
    ok?: boolean;
    motivo?: string;
    equipe_id?: string;
    status?: string;
    confirmou_agora?: boolean;
  };

  if (resultado.ok !== true || !resultado.equipe_id) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  const equipeId = resultado.equipe_id;
  const participanteId = userData.user.id;

  after(() => enviarEntradaEquipe(equipeId, participanteId));

  if (resultado.confirmou_agora === true) {
    after(() => enviarEquipeConfirmada(equipeId));
  }

  revalidar();

  return {
    ok: true,
    mensagem:
      resultado.status === "confirmada"
        ? "Você entrou na equipe. Ela está confirmada no evento!"
        : "Você entrou na equipe. Falta completar o mínimo de membros.",
    equipeId,
  };
}

export async function sairEquipe(
  _estado: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const equipeId = texto(formData, "equipe_id");

  if (!REGEX_UUID.test(equipeId)) {
    return { ok: false, mensagem: "Equipe inválida." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("sair_equipe", {
    p_equipe_id: equipeId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao sair da equipe.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as { ok?: boolean; motivo?: string };

  if (resultado.ok !== true) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  revalidar();
  return { ok: true, mensagem: "Você saiu da equipe." };
}

export async function removerMembroEquipe(
  _estado: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const equipeId = texto(formData, "equipe_id");
  const participanteId = texto(formData, "participante_id");

  if (!REGEX_UUID.test(equipeId) || !REGEX_UUID.test(participanteId)) {
    return { ok: false, mensagem: "Membro inválido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("remover_membro_equipe", {
    p_equipe_id: equipeId,
    p_participante_id: participanteId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao remover membro.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as { ok?: boolean; motivo?: string };

  if (resultado.ok !== true) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  revalidar();
  return { ok: true, mensagem: "Membro removido da equipe." };
}

export async function cancelarEquipe(
  _estado: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const equipeId = texto(formData, "equipe_id");

  if (!REGEX_UUID.test(equipeId)) {
    return { ok: false, mensagem: "Equipe inválida." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cancelar_equipe", {
    p_equipe_id: equipeId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao cancelar equipe.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as { ok?: boolean; motivo?: string };

  if (resultado.ok !== true) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  revalidar();
  return { ok: true, mensagem: "Equipe cancelada e inscrições liberadas." };
}

export async function transferirLiderEquipe(
  _estado: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const equipeId = texto(formData, "equipe_id");
  const novoLiderId = texto(formData, "novo_lider_id");

  if (!REGEX_UUID.test(equipeId) || !REGEX_UUID.test(novoLiderId)) {
    return { ok: false, mensagem: "Membro inválido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("transferir_lider_equipe", {
    p_equipe_id: equipeId,
    p_novo_lider_id: novoLiderId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao transferir liderança.", error);
    return { ok: false, mensagem: mensagem(undefined) };
  }

  const resultado = (data ?? {}) as { ok?: boolean; motivo?: string };

  if (resultado.ok !== true) {
    return { ok: false, mensagem: mensagem(resultado.motivo) };
  }

  revalidar();
  return { ok: true, mensagem: "Liderança transferida." };
}
