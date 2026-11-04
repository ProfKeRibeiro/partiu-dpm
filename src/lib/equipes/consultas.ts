import "server-only";

import { cache } from "react";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StatusEquipe = "formando" | "confirmada" | "cancelada";
export type PapelEquipe = "lider" | "membro";

export type MembroPublico = {
  nome: string;
  papel: PapelEquipe;
};

export type EventoDaEquipe = {
  id: string;
  titulo: string;
  inicio: string | null;
  fim: string | null;
  local: string | null;
  modalidade: string | null;
  equipeMin: number;
  equipeMax: number;
  exigeOrientador: boolean;
};

export type EquipePublica = {
  id: string;
  nome: string;
  status: StatusEquipe;
  codigo: string;
  orientadorNome: string | null;
  evento: EventoDaEquipe;
  membros: MembroPublico[];
  vagasRestantes: number;
};

export type MembroDaEquipe = {
  participanteId: string;
  nome: string;
  papel: PapelEquipe;
};

export type EquipeDoParticipante = {
  id: string;
  nome: string;
  status: StatusEquipe;
  codigo: string;
  orientadorNome: string | null;
  souLider: boolean;
  membros: MembroDaEquipe[];
};

export type EquipeDoPainel = {
  id: string;
  nome: string;
  status: StatusEquipe;
  codigo: string;
  orientadorNome: string | null;
  membros: number;
  eventoId: string;
};

function normalizarStatus(valor: unknown): StatusEquipe {
  if (valor === "confirmada" || valor === "cancelada") return valor;
  return "formando";
}

function normalizarPapel(valor: unknown): PapelEquipe {
  return valor === "lider" ? "lider" : "membro";
}

type RetornoRpc = {
  equipe_id?: string;
  nome?: string;
  status?: string;
  codigo_convite?: string;
  orientador_nome?: string | null;
  evento?: {
    id?: string;
    titulo?: string;
    data_inicio?: string | null;
    data_fim?: string | null;
    local_evento?: string | null;
    modalidade?: string | null;
    equipe_min?: number;
    equipe_max?: number;
    exige_orientador?: boolean;
  };
  membros?: Array<{ nome?: string; papel?: string }>;
  vagas_restantes?: number;
};

/** Consulta pública por código (RPC SECURITY DEFINER, liberada para anon). */
export const obterEquipePorCodigo = cache(
  async (codigo: string): Promise<EquipePublica | null> => {
    const limpo = codigo.trim();
    if (!limpo) return null;

    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("consultar_equipe_por_codigo", {
      p_codigo: limpo,
    });

    if (error || !data) return null;

    const resultado = data as RetornoRpc;

    if (!resultado.equipe_id || !resultado.nome || !resultado.evento?.id) {
      return null;
    }

    return {
      id: resultado.equipe_id,
      nome: resultado.nome,
      status: normalizarStatus(resultado.status),
      codigo: resultado.codigo_convite ?? limpo.toUpperCase(),
      orientadorNome: resultado.orientador_nome ?? null,
      evento: {
        id: resultado.evento.id,
        titulo: resultado.evento.titulo ?? "Evento",
        inicio: resultado.evento.data_inicio ?? null,
        fim: resultado.evento.data_fim ?? null,
        local: resultado.evento.local_evento ?? null,
        modalidade: resultado.evento.modalidade ?? null,
        equipeMin: resultado.evento.equipe_min ?? 2,
        equipeMax: resultado.evento.equipe_max ?? 10,
        exigeOrientador: resultado.evento.exige_orientador !== false,
      },
      membros: (resultado.membros ?? []).map((membro) => ({
        nome: membro.nome ?? "Participante",
        papel: normalizarPapel(membro.papel),
      })),
      vagasRestantes:
        typeof resultado.vagas_restantes === "number"
          ? resultado.vagas_restantes
          : Math.max(
              (resultado.evento.equipe_max ?? 10) -
                (resultado.membros?.length ?? 0),
              0,
            ),
    };
  },
);

/** Equipe do usuário logado em um evento (se ele estiver em alguma). */
export const obterMinhaEquipeNoEvento = cache(
  async (eventoId: string): Promise<EquipeDoParticipante | null> => {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data: vinculo } = await supabase
      .from("equipe_membros")
      .select("equipe_id, papel")
      .eq("evento_id", eventoId)
      .eq("participante_id", userData.user.id)
      .maybeSingle();

    if (!vinculo?.equipe_id) return null;

    return montarEquipeDoParticipante(
      supabase,
      vinculo.equipe_id as string,
      userData.user.id,
    );
  },
);

/** Equipe de um evento à qual o participante pertence, pelo id. */
export const obterEquipeDoParticipante = cache(
  async (equipeId: string): Promise<EquipeDoParticipante | null> => {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    return montarEquipeDoParticipante(supabase, equipeId, userData.user.id);
  },
);

async function montarEquipeDoParticipante(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  equipeId: string,
  usuarioId: string,
): Promise<EquipeDoParticipante | null> {
  const { data: equipe } = await supabase
    .from("equipes")
    .select("id, nome, codigo, status, orientador_nome, lider_id")
    .eq("id", equipeId)
    .maybeSingle();

  if (!equipe) return null;

  const { data: membros } = await supabase
    .from("equipe_membros")
    .select("participante_id, papel, created_at")
    .eq("equipe_id", equipeId);

  const publica = await obterEquipePorCodigo(equipe.codigo as string);

  /* A RPC devolve nomes na ordem "líder primeiro, depois por criação", sem os
   * ids. Ordenamos a leitura da tabela do mesmo jeito para casar as listas. */
  const ordenados = [...(membros ?? [])].sort((a, b) => {
    const liderA = a.papel === "lider" ? 0 : 1;
    const liderB = b.papel === "lider" ? 0 : 1;
    if (liderA !== liderB) return liderA - liderB;

    return String(a.created_at).localeCompare(String(b.created_at));
  });

  const lista = ordenados.map((membro, indice) => ({
    participanteId: membro.participante_id as string,
    nome: publica?.membros[indice]?.nome ?? "Participante",
    papel: normalizarPapel(membro.papel),
  }));

  return {
    id: equipe.id as string,
    nome: equipe.nome as string,
    status: normalizarStatus(equipe.status),
    codigo: equipe.codigo as string,
    orientadorNome: (equipe.orientador_nome as string | null) ?? null,
    souLider: equipe.lider_id === usuarioId,
    membros: lista,
  };
}

/** Equipes do usuário logado (todas), com o título do evento. */
export const listarMinhasEquipes = cache(
  async (): Promise<
    Array<EquipeDoParticipante & { eventoId: string; eventoTitulo: string }>
  > => {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data: vinculos } = await supabase
      .from("equipe_membros")
      .select("equipe_id")
      .eq("participante_id", userData.user.id);

    const ids = (vinculos ?? [])
      .map((vinculo) => vinculo.equipe_id as string)
      .filter(Boolean);

    if (ids.length === 0) return [];

    const { data: equipes } = await supabase
      .from("equipes")
      .select("id, evento_id, eventos(titulo)")
      .in("id", ids);

    const resultados = await Promise.all(
      (equipes ?? []).map(async (equipe) => {
        const detalhe = await obterEquipeDoParticipante(equipe.id as string);
        if (!detalhe) return null;

        const evento = Array.isArray(equipe.eventos)
          ? equipe.eventos[0]
          : equipe.eventos;

        return {
          ...detalhe,
          eventoId: equipe.evento_id as string,
          eventoTitulo:
            (evento as { titulo?: string } | null)?.titulo ?? "Evento",
        };
      }),
    );

    return resultados.filter(
      (
        item,
      ): item is EquipeDoParticipante & {
        eventoId: string;
        eventoTitulo: string;
      } => item !== null,
    );
  },
);

/** Equipes de um evento para o painel da organização. */
export const listarEquipesDoEvento = cache(
  async (eventoId: string): Promise<EquipeDoPainel[]> => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("equipes")
      .select("id, nome, codigo, status, orientador_nome, evento_id, equipe_membros(id)")
      .eq("evento_id", eventoId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[partiu-dpm] Falha ao listar equipes do evento.", error);
      return [];
    }

    return (data ?? []).map((registro) => ({
      id: registro.id as string,
      nome: registro.nome as string,
      status: normalizarStatus(registro.status),
      codigo: registro.codigo as string,
      orientadorNome: (registro.orientador_nome as string | null) ?? null,
      membros: Array.isArray(registro.equipe_membros)
        ? registro.equipe_membros.length
        : 0,
      eventoId: registro.evento_id as string,
    }));
  },
);
