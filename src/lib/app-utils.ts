import { formatarHorario } from "@/lib/format";

const ROTULOS_CATEGORIA: Record<string, string> = {
  aluno: "Aluno(a)",
  externo: "Público externo",
  servidor: "Servidor(a)",
  outro: "Outro",
};

export function primeiroNome(nome: string | null | undefined) {
  const limpo = nome?.trim();
  if (!limpo) return "participante";

  return limpo.split(/\s+/)[0];
}

export function iniciais(nome: string | null | undefined) {
  const partes =
    nome
      ?.trim()
      .split(/\s+/)
      .filter((parte) => parte.length > 0) ?? [];

  if (partes.length === 0) return "DP";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function rotuloCategoria(categoria: string | null | undefined) {
  if (!categoria) return "Participante";

  return ROTULOS_CATEGORIA[categoria] ?? "Participante";
}

export function faixaHorario(
  inicio: string | null | undefined,
  fim: string | null | undefined,
) {
  const comeco = formatarHorario(inicio);
  const termino = formatarHorario(fim);

  if (!comeco) return "";
  if (!termino || comeco === termino) return comeco;

  return `${comeco} às ${termino}`;
}

/**
 * Link interno preservando a rota atual. Usado nos filtros da área do
 * participante para não perder a busca ao trocar de página.
 */
export function hrefComParams(
  base: string,
  params: Record<string, string | null | undefined>,
  pagina?: number,
) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([chave, valor]) => {
    if (valor) search.set(chave, valor);
  });

  if (pagina && pagina > 1) search.set("pagina", String(pagina));

  const query = search.toString();
  return query ? `${base}?${query}` : base;
}
