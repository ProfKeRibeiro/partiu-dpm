import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AlunoEscolaAdmin = {
  nome: string;
  email: string;
  status: "pendente" | "autorizado" | "recusado";
  inscricaoId: string | null;
  criadoEm: string;
};

export type EscolaInscricaoAdmin = {
  escolaId: string;
  escolaNome: string;
  responsavelNome: string;
  responsavelEmail: string;
  codigo: string;
  status: string;
  criadoEm: string;
  autorizados: number;
  pendentes: number;
  alunos: AlunoEscolaAdmin[];
};

export type EscolaPublica = {
  escolaInscricaoId: string;
  escolaNome: string;
  status: string;
  codigo: string;
  evento: {
    id: string;
    titulo: string;
    dataInicio: string;
    local: string | null;
    modalidade: string;
  };
  autorizados: number;
  pendentes: number;
};

export async function listarEscolasDoEvento(
  eventoId: string,
): Promise<EscolaInscricaoAdmin[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_listar_escolas_evento", {
    p_evento_id: eventoId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao listar escolas do evento.", error);
    return [];
  }

  const registros = Array.isArray(data) ? data : [];

  return registros.map((registro) => {
    const item = registro as Record<string, unknown>;

    return {
      escolaId: String(item.escola_inscricao_id ?? ""),
      escolaNome: String(item.escola_nome ?? "Escola"),
      responsavelNome: String(item.responsavel_nome ?? ""),
      responsavelEmail: String(item.responsavel_email ?? ""),
      codigo: String(item.codigo ?? ""),
      status: String(item.status ?? "ativa"),
      criadoEm: String(item.criado_em ?? ""),
      autorizados: Number(item.autorizados ?? 0),
      pendentes: Number(item.pendentes ?? 0),
      alunos: (Array.isArray(item.alunos) ? item.alunos : []).map(
        (aluno) => {
          const linha = aluno as Record<string, unknown>;

          return {
            nome: String(linha.nome ?? ""),
            email: String(linha.email ?? ""),
            status: (linha.status as AlunoEscolaAdmin["status"]) ?? "pendente",
            inscricaoId:
              typeof linha.inscricao_id === "string"
                ? linha.inscricao_id
                : null,
            criadoEm: String(linha.criado_em ?? ""),
          };
        },
      ),
    };
  });
}

export async function consultarEscolaPorCodigo(
  codigo: string,
): Promise<EscolaPublica | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("consultar_escola_por_codigo", {
    p_codigo: codigo,
  });

  if (error || !data) return null;

  const item = data as Record<string, unknown>;
  const evento = (item.evento ?? {}) as Record<string, unknown>;

  return {
    escolaInscricaoId: String(item.escola_inscricao_id ?? ""),
    escolaNome: String(item.escola_nome ?? "Escola"),
    status: String(item.status ?? "ativa"),
    codigo: String(item.codigo ?? codigo),
    evento: {
      id: String(evento.id ?? ""),
      titulo: String(evento.titulo ?? "Evento"),
      dataInicio: String(evento.data_inicio ?? ""),
      local: typeof evento.local_evento === "string" ? evento.local_evento : null,
      modalidade: String(evento.modalidade ?? ""),
    },
    autorizados: Number(item.autorizados ?? 0),
    pendentes: Number(item.pendentes ?? 0),
  };
}
