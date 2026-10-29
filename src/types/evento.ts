export const MODALIDADES = ["presencial", "online", "hibrida"] as const;
export type Modalidade = (typeof MODALIDADES)[number];

export const PUBLICOS_ALVO = [
  "alunos_escola",
  "professores_funcionarios",
  "comunidade_escolar",
  "externo",
  "todos",
] as const;
export type PublicoAlvo = (typeof PUBLICOS_ALVO)[number];

export const STATUS_EVENTO = [
  "rascunho",
  "publicado",
  "cancelado",
  "encerrado",
] as const;
export type StatusEvento = (typeof STATUS_EVENTO)[number];

export type SituacaoInscricao =
  | "aberta"
  | "em-breve"
  | "encerrada"
  | "lotado";

export type Evento = {
  id: string;
  slug: string | null;
  titulo: string;
  descricao: string;
  tipo: string;
  modalidade: Modalidade;
  local: string | null;
  linkAcesso: string | null;
  inicio: string;
  fim: string;
  inscricoesInicio: string | null;
  inscricoesFim: string | null;
  limiteVagas: number | null;
  inscritos: number | null;
  publicoAlvo: PublicoAlvo;
  cursosPermitidos: string[] | null;
  seriesPermitidas: string[] | null;
  status: StatusEvento;
  imagemUrl: string | null;
  corTema: string | null;
};
