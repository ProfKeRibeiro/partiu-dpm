import "server-only";

import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Modalidade } from "@/types/evento";

export type StatusInscricao =
  | "confirmada"
  | "cancelada"
  | "lista_espera"
  | "aguardando_confirmacao";

export type InscricaoDoUsuario = {
  id: string;
  status: StatusInscricao;
  dataInscricao: string;
  conviteExpiraEm: string | null;
  evento: {
    id: string;
    titulo: string;
    inicio: string;
    fim: string;
    modalidade: Modalidade;
    local: string | null;
    imagemUrl: string | null;
    status: string;
  } | null;
  presente: boolean;
  certificado: {
    status: string;
    codigo: string;
    dataEmissao: string | null;
  } | null;
};

export type ContextoEvento = {
  autenticado: boolean;
  nome: string | null;
  inscricao: {
    id: string;
    status: StatusInscricao;
    conviteExpiraEm: string | null;
  } | null;
  linkAcesso: string | null;
  posicaoFila: number | null;
};

function primeiro<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

function normalizarStatus(valor: unknown): StatusInscricao {
  if (valor === "cancelada" || valor === "lista_espera") return valor;
  if (valor === "aguardando_confirmacao") return "aguardando_confirmacao";
  return "confirmada";
}

function normalizarModalidade(valor: unknown): Modalidade {
  if (valor === "online") return "online";
  if (valor === "hibrido" || valor === "hibrida") return "hibrida";
  return "presencial";
}

/**
 * Inscrições do usuário com evento, presença e certificado.
 *
 * A RLS de `inscricoes` já limita as linhas ao próprio participante. A consulta
 * pede apenas colunas com grant explícito, porque `link_evento` ficou fora do
 * acesso direto.
 */
export const listarMinhasInscricoes = cache(
  async (): Promise<InscricaoDoUsuario[]> => {
    if (!isSupabaseConfigured) return [];

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("inscricoes")
    .select(
      `id, status, data_inscricao, convite_expira_em,
       eventos (id, titulo, data_inicio, data_fim, modalidade, local_evento, imagem_url, status),
       presencas (presente, data_registro),
       certificados (status, codigo_validacao, data_emissao)`,
    )
    .eq("participante_id", userData.user.id)
    .order("data_inscricao", { ascending: false });

  if (error) {
    console.error(
      "[partiu-dpm] Não foi possível carregar as inscrições do usuário.",
      error,
    );
    return [];
  }

  return (data ?? []).map((registro) => {
    const evento = primeiro(
      registro.eventos as
        | {
            id: string;
            titulo: string;
            data_inicio: string;
            data_fim: string;
            modalidade: string;
            local_evento: string | null;
            imagem_url: string | null;
            status: string;
          }
        | {
            id: string;
            titulo: string;
            data_inicio: string;
            data_fim: string;
            modalidade: string;
            local_evento: string | null;
            imagem_url: string | null;
            status: string;
          }[]
        | null,
    );
    const presenca = primeiro(
      registro.presencas as
        | { presente: boolean; data_registro: string | null }
        | { presente: boolean; data_registro: string | null }[]
        | null,
    );
    const certificado = primeiro(
      registro.certificados as
        | { status: string; codigo_validacao: string; data_emissao: string }
        | { status: string; codigo_validacao: string; data_emissao: string }[]
        | null,
    );

    return {
      id: registro.id as string,
      status: normalizarStatus(registro.status),
      dataInscricao: registro.data_inscricao as string,
      conviteExpiraEm: (registro.convite_expira_em as string | null) ?? null,
      evento: evento
        ? {
            id: evento.id,
            titulo: evento.titulo,
            inicio: evento.data_inicio,
            fim: evento.data_fim,
            modalidade: normalizarModalidade(evento.modalidade),
            local: evento.local_evento,
            imagemUrl: evento.imagem_url,
            status: evento.status,
          }
        : null,
      presente: presenca?.presente === true,
      certificado: certificado
        ? {
            status: certificado.status,
            codigo: certificado.codigo_validacao,
            dataEmissao: certificado.data_emissao,
          }
        : null,
    };
    });
  },
);

/** Quantas pessoas aguardam vaga neste evento. */
export const contarFilaEspera = cache(async (eventoId: string) => {
  if (!isSupabaseConfigured) return 0;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("contar_lista_espera", {
    p_evento_id: eventoId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao contar a lista de espera.", error);
    return 0;
  }

  return typeof data === "number" ? data : 0;
});

/** Posição (1 = próximo) na fila de espera do evento. */
const posicaoNaFila = cache(async (inscricaoId: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("posicao_lista_espera", {
    p_inscricao_id: inscricaoId,
  });

  if (error) return null;

  return typeof data === "number" ? data : null;
});

export async function obterContextoEvento(
  eventoId: string,
): Promise<ContextoEvento> {
  const vazio: ContextoEvento = {
    autenticado: false,
    nome: null,
    inscricao: null,
    linkAcesso: null,
    posicaoFila: null,
  };

  if (!isSupabaseConfigured) return vazio;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return vazio;

  const [{ data: inscricao }, { data: link }, { data: perfil }] =
    await Promise.all([
      supabase
        .from("inscricoes")
        .select("id, status, convite_expira_em")
        .eq("evento_id", eventoId)
        .eq("participante_id", userData.user.id)
        .maybeSingle(),
      supabase.rpc("link_evento_do_inscrito", { p_evento_id: eventoId }),
      supabase
        .from("participantes")
        .select("nome_completo")
        .eq("id", userData.user.id)
        .maybeSingle(),
    ]);

  const status = inscricao ? normalizarStatus(inscricao.status) : null;
  const posicaoFila =
    inscricao && status === "lista_espera"
      ? await posicaoNaFila(inscricao.id as string)
      : null;

  return {
    autenticado: true,
    nome: perfil?.nome_completo ?? userData.user.email ?? null,
    inscricao: inscricao
      ? {
          id: inscricao.id as string,
          status: status as StatusInscricao,
          conviteExpiraEm:
            (inscricao.convite_expira_em as string | null) ?? null,
        }
      : null,
    linkAcesso: typeof link === "string" && link.trim() ? link : null,
    posicaoFila,
  };
}
