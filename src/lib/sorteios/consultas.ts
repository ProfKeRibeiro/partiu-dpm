import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SorteioPublico = {
  sorteioId: string;
  nome: string;
  status: string;
  semente: string | null;
  realizadoEm: string | null;
  quantidadeVencedores: number;
  evento: { id: string; titulo: string; dataInicio: string };
  inscritos: number;
  vencedores: string[];
};

export type ParticipanteSorteio = {
  nome: string;
  elegivel: boolean;
  status: string;
  sorteio: { id: string; nome: string; status: string };
  evento: { id: string; titulo: string };
};

export type ParticipanteSorteioAdmin = {
  participanteId: string;
  nome: string;
  email: string;
  emailResponsavel: string | null;
  elegivel: boolean;
  ordem: number | null;
  vencedor: boolean;
  consentimentoStatus: string | null;
  criadoEm: string;
};

export async function consultarResultadoSorteio(
  sorteioId: string,
): Promise<SorteioPublico | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("consultar_resultado_sorteio", {
    p_sorteio_id: sorteioId,
  });

  if (error || !data) return null;

  const item = data as Record<string, unknown>;
  const evento = (item.evento ?? {}) as Record<string, unknown>;

  return {
    sorteioId: String(item.sorteio_id ?? ""),
    nome: String(item.nome ?? "Sorteio"),
    status: String(item.status ?? "aberto"),
    semente: typeof item.semente === "string" ? item.semente : null,
    realizadoEm:
      typeof item.realizado_em === "string" ? item.realizado_em : null,
    quantidadeVencedores: Number(item.quantidade_vencedores ?? 1),
    evento: {
      id: String(evento.id ?? ""),
      titulo: String(evento.titulo ?? "Evento"),
      dataInicio: String(evento.data_inicio ?? ""),
    },
    inscritos: Number(item.inscritos ?? 0),
    vencedores: Array.isArray(item.vencedores)
      ? item.vencedores.map((nome) => String(nome))
      : [],
  };
}

export async function consultarParticipanteSorteio(
  token: string,
): Promise<ParticipanteSorteio | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc(
    "consultar_participante_por_token",
    { p_token: token },
  );

  if (error || !data) return null;

  const item = data as Record<string, unknown>;
  const sorteio = (item.sorteio ?? {}) as Record<string, unknown>;
  const evento = (item.evento ?? {}) as Record<string, unknown>;

  return {
    nome: String(item.nome ?? ""),
    elegivel: item.elegivel === true,
    status: String(item.status ?? "aguardando_responsavel"),
    sorteio: {
      id: String(sorteio.id ?? ""),
      nome: String(sorteio.nome ?? ""),
      status: String(sorteio.status ?? ""),
    },
    evento: {
      id: String(evento.id ?? ""),
      titulo: String(evento.titulo ?? ""),
    },
  };
}

export async function listarParticipantesSorteio(
  sorteioId: string,
): Promise<ParticipanteSorteioAdmin[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "admin_listar_participantes_sorteio",
    { p_sorteio_id: sorteioId },
  );

  if (error) {
    console.error("[partiu-dpm] Falha ao listar participantes do sorteio.", error);
    return [];
  }

  return (Array.isArray(data) ? data : []).map((registro) => {
    const item = registro as Record<string, unknown>;

    return {
      participanteId: String(item.participante_id ?? ""),
      nome: String(item.nome ?? ""),
      email: String(item.email ?? ""),
      emailResponsavel:
        typeof item.email_responsavel === "string"
          ? item.email_responsavel
          : null,
      elegivel: item.elegivel === true,
      ordem: typeof item.ordem === "number" ? item.ordem : null,
      vencedor: item.vencedor === true,
      consentimentoStatus:
        typeof item.consentimento_status === "string"
          ? item.consentimento_status
          : null,
      criadoEm: String(item.criado_em ?? ""),
    };
  });
}
