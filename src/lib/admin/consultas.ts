import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PUBLICOS_ALVO,
  type Modalidade,
  type PublicoAlvo,
} from "@/types/evento";

export type EventoAdmin = {
  id: string;
  titulo: string;
  status: string;
  inicio: string;
  fim: string;
  modalidade: Modalidade;
  limiteVagas: number | null;
  inscritos: number;
};

export type EventoAdminEdicao = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  modalidade: "presencial" | "online" | "hibrido";
  local: string | null;
  link: string | null;
  inicio: string;
  fim: string;
  inscricoesInicio: string | null;
  inscricoesFim: string | null;
  limiteVagas: number | null;
  publicoAlvo: PublicoAlvo;
  cursosPermitidos: string[];
  seriesPermitidas: string[];
  status: string;
  imagemUrl: string | null;
  corTema: string;
  inscritos: number;
};

export type InscricaoAdmin = {
  inscricaoId: string;
  participanteId: string;
  nomeCompleto: string;
  email: string | null;
  categoria: string;
  curso: string | null;
  anoSerie: string | null;
  instituicao: string | null;
  status: string;
  dataInscricao: string;
  presente: boolean;
  dataPresenca: string | null;
  certificadoStatus: string | null;
  certificadoCodigo: string | null;
  certificadoData: string | null;
};

function normalizarModalidade(valor: unknown): Modalidade {
  if (valor === "online") return "online";
  if (valor === "hibrido" || valor === "hibrida") return "hibrida";
  return "presencial";
}

export async function listarEventosAdmin(): Promise<EventoAdmin[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("eventos")
    .select(
      "id, titulo, status, data_inicio, data_fim, modalidade, limite_vagas, inscritos",
    )
    .order("data_inicio", { ascending: false });

  if (error) {
    console.error("[partiu-dpm] Falha ao listar eventos no admin.", error);
    return [];
  }

  return (data ?? []).map((registro) => ({
    id: registro.id as string,
    titulo: registro.titulo as string,
    status: registro.status as string,
    inicio: registro.data_inicio as string,
    fim: registro.data_fim as string,
    modalidade: normalizarModalidade(registro.modalidade),
    limiteVagas: (registro.limite_vagas as number | null) ?? null,
    inscritos: (registro.inscritos as number | null) ?? 0,
  }));
}

export async function obterEventoAdmin(
  id: string,
): Promise<EventoAdmin | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("eventos")
    .select(
      "id, titulo, status, data_inicio, data_fim, modalidade, limite_vagas, inscritos",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    titulo: data.titulo as string,
    status: data.status as string,
    inicio: data.data_inicio as string,
    fim: data.data_fim as string,
    modalidade: normalizarModalidade(data.modalidade),
    limiteVagas: (data.limite_vagas as number | null) ?? null,
    inscritos: (data.inscritos as number | null) ?? 0,
  };
}

function textoOuNulo(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function listaTexto(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];

  return valor
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizarPublico(valor: unknown): PublicoAlvo {
  if (valor === "escola") return "comunidade_escolar";
  if (PUBLICOS_ALVO.includes(valor as PublicoAlvo)) {
    return valor as PublicoAlvo;
  }
  return "todos";
}

/**
 * Leitura completa do evento para o formulário de edição.
 *
 * A coluna `link_evento` não tem grant de SELECT para `authenticated`; por
 * isso esta consulta passa pela RPC `admin_obter_evento`, que exige
 * `eh_admin()` e devolve o registro inteiro.
 */
export async function obterEventoParaEdicao(
  id: string,
): Promise<EventoAdminEdicao | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_obter_evento", {
    p_evento_id: id,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao carregar evento para edição.", error);
    return null;
  }

  if (!data) return null;

  const registro = data as Record<string, unknown>;
  const titulo = textoOuNulo(registro.titulo);
  const inicio = textoOuNulo(registro.data_inicio);
  const fim = textoOuNulo(registro.data_fim);

  if (!titulo || !inicio || !fim) return null;

  const modalidade =
    registro.modalidade === "online"
      ? "online"
      : registro.modalidade === "hibrido" ||
          registro.modalidade === "hibrida"
        ? "hibrido"
        : "presencial";

  return {
    id: String(registro.id),
    titulo,
    descricao: textoOuNulo(registro.descricao) ?? "",
    tipo: textoOuNulo(registro.tipo) ?? "outro",
    modalidade,
    local: textoOuNulo(registro.local_evento),
    link: textoOuNulo(registro.link_evento),
    inicio,
    fim,
    inscricoesInicio: textoOuNulo(registro.inicio_inscricoes),
    inscricoesFim: textoOuNulo(registro.fim_inscricoes),
    limiteVagas:
      typeof registro.limite_vagas === "number"
        ? registro.limite_vagas
        : null,
    publicoAlvo: normalizarPublico(registro.publico_alvo),
    cursosPermitidos: listaTexto(registro.cursos_permitidos),
    seriesPermitidas: listaTexto(registro.series_permitidas),
    status: textoOuNulo(registro.status) ?? "rascunho",
    imagemUrl: textoOuNulo(registro.imagem_url),
    corTema: textoOuNulo(registro.cor_tema) ?? "azul-petroleo",
    inscritos:
      typeof registro.inscritos === "number" ? registro.inscritos : 0,
  };
}

export async function listarInscricoesAdmin(
  eventoId: string,
): Promise<InscricaoAdmin[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_listar_inscricoes", {
    p_evento_id: eventoId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao listar inscrições no admin.", error);
    return [];
  }

  const registros = Array.isArray(data) ? data : [];

  return registros.map((registro) => {
    const item = registro as Record<string, unknown>;

    return {
      inscricaoId: String(item.inscricao_id ?? ""),
      participanteId: String(item.participante_id ?? ""),
      nomeCompleto: String(item.nome_completo ?? "Participante"),
      email: typeof item.email === "string" ? item.email : null,
      categoria: String(item.categoria ?? "aluno"),
      curso: typeof item.curso === "string" ? item.curso : null,
      anoSerie: typeof item.ano_serie === "string" ? item.ano_serie : null,
      instituicao:
        typeof item.instituicao === "string" ? item.instituicao : null,
      status: String(item.status ?? "confirmada"),
      dataInscricao: String(item.data_inscricao ?? ""),
      presente: item.presente === true,
      dataPresenca:
        typeof item.data_presenca === "string" ? item.data_presenca : null,
      certificadoStatus:
        typeof item.certificado_status === "string"
          ? item.certificado_status
          : null,
      certificadoCodigo:
        typeof item.certificado_codigo === "string"
          ? item.certificado_codigo
          : null,
      certificadoData:
        typeof item.certificado_data === "string"
          ? item.certificado_data
          : null,
    };
  });
}
