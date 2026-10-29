import type {
  Evento,
  Modalidade,
  PublicoAlvo,
  SituacaoInscricao,
} from "@/types/evento";

export const ROTULOS_MODALIDADE: Record<Modalidade, string> = {
  presencial: "Presencial",
  online: "Online",
  hibrida: "Híbrido",
};

export const ROTULOS_PUBLICO: Record<PublicoAlvo, string> = {
  alunos_escola: "Alunos da escola",
  professores_funcionarios: "Professores e funcionários",
  comunidade_escolar: "Comunidade escolar",
  externo: "Público externo",
  todos: "Todos",
};

const ROTULOS_TIPO: Record<string, string> = {
  treinamento: "Treinamento",
  palestra: "Palestra",
  oficina: "Oficina",
  curso: "Curso",
  feira: "Feira",
  workshop: "Workshop",
  seminario: "Seminário",
  encontro: "Encontro",
};

export const ROTULOS_SITUACAO: Record<SituacaoInscricao, string> = {
  aberta: "Inscrições abertas",
  "em-breve": "Inscrições em breve",
  encerrada: "Inscrições encerradas",
  lotado: "Esgotado",
};

export function rotuloTipo(tipo: string) {
  const chave = tipo.trim().toLowerCase();
  const rotulo = ROTULOS_TIPO[chave];

  if (rotulo) return rotulo;

  return chave.charAt(0).toUpperCase() + chave.slice(1);
}

export function dataDoEvento(valor: string): Date {
  return new Date(valor);
}

export function eventoRealizado(evento: Evento, agora: Date = new Date()) {
  return dataDoEvento(evento.fim).getTime() < agora.getTime();
}

/**
 * Regras de exibição do período de inscrições.
 * A validação definitiva deve acontecer no banco de dados.
 */
export function situacaoInscricao(
  evento: Evento,
  agora: Date = new Date(),
): SituacaoInscricao {
  const agoraMs = agora.getTime();
  const inicioEventoMs = dataDoEvento(evento.inicio).getTime();
  const fimEventoMs = dataDoEvento(evento.fim).getTime();
  const aberturaMs = evento.inscricoesInicio
    ? dataDoEvento(evento.inscricoesInicio).getTime()
    : null;
  const encerramentoMs = evento.inscricoesFim
    ? dataDoEvento(evento.inscricoesFim).getTime()
    : inicioEventoMs;

  if (fimEventoMs < agoraMs) return "encerrada";
  if (agoraMs > encerramentoMs) return "encerrada";
  if (aberturaMs && agoraMs < aberturaMs) return "em-breve";

  if (
    evento.limiteVagas !== null &&
    evento.inscritos !== null &&
    evento.inscritos >= evento.limiteVagas
  ) {
    return "lotado";
  }

  return "aberta";
}

export function vagasRestantes(evento: Evento) {
  if (evento.limiteVagas === null) return null;
  if (evento.inscritos === null) return evento.limiteVagas;

  return Math.max(0, evento.limiteVagas - evento.inscritos);
}

export function percentualOcupacao(evento: Evento) {
  if (!evento.limiteVagas || evento.inscritos === null) return null;

  const percentual = (evento.inscritos / evento.limiteVagas) * 100;
  return Math.min(100, Math.max(0, Math.round(percentual)));
}

export function textoVagas(evento: Evento) {
  const restantes = vagasRestantes(evento);

  if (evento.limiteVagas === null) return "Vagas conforme organização";
  if (restantes === null) return `${evento.limiteVagas} vagas`;

  if (restantes === 0) return "Sem vagas disponíveis";
  if (restantes === 1) return "1 vaga restante";

  return `${restantes} vagas restantes`;
}
