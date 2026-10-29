import "server-only";

import { cache } from "react";
import { eventosDemonstracao } from "@/lib/demo-eventos";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type {
  Evento,
  Modalidade,
  PublicoAlvo,
  StatusEvento,
} from "@/types/evento";

export type ResultadoListaEventos = {
  eventos: Evento[];
  erro: boolean;
  demonstracao: boolean;
};

export type ResultadoEvento = {
  evento: Evento | null;
  erro: boolean;
  demonstracao: boolean;
};

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function detalhesErro(erro: unknown) {
  if (typeof erro !== "object" || erro === null) {
    return { message: String(erro) };
  }

  const detalhes = erro as Record<string, unknown>;

  return {
    name: detalhes.name ?? (erro instanceof Error ? erro.name : undefined),
    message:
      detalhes.message ?? (erro instanceof Error ? erro.message : undefined),
    code: detalhes.code,
    details: detalhes.details,
    hint: detalhes.hint,
    status: detalhes.status,
  };
}

/**
 * Colunas públicas de `eventos`.
 *
 * `link_evento` e `criado_por` ficam de fora de propósito: o link de acesso não
 * deve ser legível com a chave `anon`, e o autor do cadastro não é informação
 * pública. A lista também permite revogar o SELECT amplo da tabela sem quebrar
 * as páginas.
 */
const CAMPOS_EVENTO_PUBLICO =
  "id, titulo, descricao, tipo, modalidade, local_evento, data_inicio, data_fim, inicio_inscricoes, fim_inscricoes, limite_vagas, publico_alvo, cursos_permitidos, series_permitidas, status, imagem_url, cor_tema, inscritos" as const;

function normalizarChave(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function valorTexto(
  registro: Record<string, unknown>,
  chaves: string[],
): string | null {
  for (const chave of chaves) {
    const valor = registro[chave];

    if (typeof valor === "string" && valor.trim()) {
      return valor.trim();
    }
  }

  return null;
}

function valorNumero(
  registro: Record<string, unknown>,
  chaves: string[],
): number | null {
  for (const chave of chaves) {
    const valor = registro[chave];

    if (typeof valor === "number" && Number.isFinite(valor)) {
      return valor;
    }

    if (typeof valor === "string" && valor.trim()) {
      const numero = Number(valor);
      if (Number.isFinite(numero)) return numero;
    }
  }

  return null;
}

function valorData(
  registro: Record<string, unknown>,
  chaves: string[],
): string | null {
  const texto = valorTexto(registro, chaves);
  if (!texto) return null;

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return null;

  return data.toISOString();
}

function valorLista(
  registro: Record<string, unknown>,
  chaves: string[],
): string[] | null {
  for (const chave of chaves) {
    const valor = registro[chave];

    if (Array.isArray(valor)) {
      const itens = valor
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);

      if (itens.length > 0) return itens;
    }

    if (typeof valor === "string" && valor.trim()) {
      const itens = valor
        .split(/[;,|]/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (itens.length > 0) return itens;
    }
  }

  return null;
}

function normalizarModalidade(valor: string | null): Modalidade {
  if (!valor) return "presencial";

  const chave = normalizarChave(valor);

  if (chave.includes("hibrid")) return "hibrida";
  if (chave.includes("online") || chave.includes("remot")) return "online";

  return "presencial";
}

function normalizarPublico(valor: string | null): PublicoAlvo {
  if (!valor) return "todos";

  const chave = normalizarChave(valor);

  if (chave === "escola" || chave === "comunidade_escolar") {
    return "comunidade_escolar";
  }
  if (chave === "alunos_escola") return "alunos_escola";
  if (chave === "professores_funcionarios") {
    return "professores_funcionarios";
  }
  if (chave === "externo") return "externo";
  if (chave === "todos") return "todos";

  return "todos";
}

function normalizarStatus(valor: string | null): StatusEvento {
  if (!valor) return "rascunho";

  const chave = normalizarChave(valor);

  if (chave === "publicado") return "publicado";
  if (chave === "cancelado") return "cancelado";
  if (chave === "encerrado") return "encerrado";

  return "rascunho";
}

/**
 * Converte um registro do Supabase no tipo de domínio da aplicação.
 *
 * Alguns nomes alternativos são aceitos para facilitar a compatibilidade com
 * o schema já existente. O contrato principal está documentado em
 * docs/banco-de-dados.md.
 */
function mapearEvento(registro: Record<string, unknown>): Evento | null {
  const id = valorTexto(registro, ["id"]);
  const titulo = valorTexto(registro, ["titulo", "nome", "title"]);
  const inicio = valorData(registro, [
    "data_inicio",
    "inicio",
    "comeca_em",
    "data_hora_inicio",
  ]);

  if (!id || !titulo || !inicio) return null;

  const fim =
    valorData(registro, ["data_fim", "fim", "termina_em", "data_hora_fim"]) ??
    inicio;

  return {
    id,
    slug: valorTexto(registro, ["slug"]),
    titulo,
    descricao:
      valorTexto(registro, [
        "descricao",
        "descricao_completa",
        "sobre",
        "resumo",
      ]) ?? "",
    tipo: valorTexto(registro, ["tipo", "tipo_evento", "categoria"]) ?? "evento",
    modalidade: normalizarModalidade(
      valorTexto(registro, ["modalidade", "formato"]),
    ),
    local: valorTexto(registro, ["local", "local_evento", "local_nome"]),
    linkAcesso: valorTexto(registro, [
      "link_evento",
      "link_acesso",
      "link",
      "url_acesso",
      "link_transmissao",
    ]),
    inicio,
    fim,
    inscricoesInicio: valorData(registro, [
      "inscricoes_inicio",
      "inicio_inscricoes",
      "inscricoes_abertura",
      "data_abertura_inscricoes",
      "abertura_inscricoes",
    ]),
    inscricoesFim: valorData(registro, [
      "inscricoes_fim",
      "fim_inscricoes",
      "inscricoes_encerramento",
      "data_encerramento_inscricoes",
      "encerramento_inscricoes",
    ]),
    limiteVagas: valorNumero(registro, [
      "limite_vagas",
      "vagas",
      "vagas_totais",
      "limite_participantes",
    ]),
    inscritos: valorNumero(registro, [
      "inscritos",
      "total_inscritos",
      "inscritos_count",
      "vagas_preenchidas",
    ]),
    publicoAlvo: normalizarPublico(
      valorTexto(registro, ["publico_alvo", "publico", "publico_tipo"]),
    ),
    cursosPermitidos: valorLista(registro, [
      "cursos_permitidos",
      "cursos",
      "cursos_alvo",
    ]),
    seriesPermitidas: valorLista(registro, [
      "series_permitidas",
      "series",
      "anos_series",
      "series_alvo",
    ]),
    status: normalizarStatus(valorTexto(registro, ["status", "situacao"])),
    imagemUrl: valorTexto(registro, [
      "imagem_url",
      "imagem",
      "imagem_capa",
      "capa_url",
      "banner_url",
    ]),
    corTema: valorTexto(registro, ["cor_tema"]),
  };
}

function porInicio(a: Evento, b: Evento) {
  return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
}

export const listarEventosPublicados = cache(
  async (): Promise<ResultadoListaEventos> => {
    if (!isSupabaseConfigured) {
      return {
        eventos: [...eventosDemonstracao].sort(porInicio),
        erro: false,
        demonstracao: true,
      };
    }

    try {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("eventos")
        .select(CAMPOS_EVENTO_PUBLICO)
        .eq("status", "publicado")
        .limit(100);

      if (error) throw error;

      const eventos = (data ?? [])
        .map((registro) => mapearEvento(registro as Record<string, unknown>))
        .filter(
          (evento): evento is Evento =>
            evento !== null && evento.status === "publicado",
        )
        .sort(porInicio);

      return { eventos, erro: false, demonstracao: false };
    } catch (erro) {
      console.error(
        "[partiu-dpm] Não foi possível carregar os eventos publicados.",
        detalhesErro(erro),
      );

      return { eventos: [], erro: true, demonstracao: false };
    }
  },
);

export const buscarEventoPublicado = cache(
  async (id: string): Promise<ResultadoEvento> => {
    if (!isSupabaseConfigured) {
      const evento =
        eventosDemonstracao.find(
          (item) => item.id === id || item.slug === id,
        ) ?? null;

      return { evento, erro: false, demonstracao: true };
    }

    if (!REGEX_UUID.test(id)) {
      return { evento: null, erro: false, demonstracao: false };
    }

    try {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("eventos")
        .select(CAMPOS_EVENTO_PUBLICO)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      const evento = data
        ? mapearEvento(data as Record<string, unknown>)
        : null;

      if (!evento || evento.status !== "publicado") {
        return { evento: null, erro: false, demonstracao: false };
      }

      return { evento, erro: false, demonstracao: false };
    } catch (erro) {
      console.error("[partiu-dpm] Não foi possível carregar o evento.", erro);
      return { evento: null, erro: true, demonstracao: false };
    }
  },
);
