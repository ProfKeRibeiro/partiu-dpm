import "server-only";

import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Modalidade } from "@/types/evento";

export type StatusInscricao = "confirmada" | "cancelada" | "lista_espera";

export type InscricaoDoUsuario = {
  id: string;
  status: StatusInscricao;
  dataInscricao: string;
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
  inscricao: { id: string; status: StatusInscricao } | null;
  linkAcesso: string | null;
};

function primeiro<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

function normalizarStatus(valor: unknown): StatusInscricao {
  if (valor === "cancelada" || valor === "lista_espera") return valor;
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
      `id, status, data_inscricao,
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

export async function obterContextoEvento(
  eventoId: string,
): Promise<ContextoEvento> {
  const vazio: ContextoEvento = {
    autenticado: false,
    nome: null,
    inscricao: null,
    linkAcesso: null,
  };

  if (!isSupabaseConfigured) return vazio;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return vazio;

  const [{ data: inscricao }, { data: link }, { data: perfil }] =
    await Promise.all([
      supabase
        .from("inscricoes")
        .select("id, status")
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

  return {
    autenticado: true,
    nome: perfil?.nome_completo ?? userData.user.email ?? null,
    inscricao: inscricao
      ? {
          id: inscricao.id as string,
          status: normalizarStatus(inscricao.status),
        }
      : null,
    linkAcesso: typeof link === "string" && link.trim() ? link : null,
  };
}
