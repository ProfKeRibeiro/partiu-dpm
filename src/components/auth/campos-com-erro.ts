/**
 * Associa a mensagem de erro de uma Server Action ao campo que a causou.
 *
 * As ações devolvem apenas texto (sem metadado de campo), então o vínculo é
 * feito pelas palavras da mensagem. Serve para marcar `aria-invalid` e
 * `aria-describedby`, não para decidir autorização ou validação.
 */
export type CampoComErro =
  | "nome"
  | "email"
  | "senha"
  | "confirmacao"
  | "curso"
  | "serie"
  | "instituicao"
  | "linkedin"
  | "categoria";

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function camposDoErro(mensagem?: string | null): CampoComErro[] {
  const texto = normalizar(mensagem ?? "");
  if (!texto) return [];

  const campos = new Set<CampoComErro>();

  if (/e-?mail/.test(texto)) campos.add("email");
  if (/senha/.test(texto)) campos.add("senha");
  if (/iguais|confirma/.test(texto) && campos.has("senha")) {
    campos.add("confirmacao");
  }
  if (/\bnome\b/.test(texto)) campos.add("nome");
  if (/curso/.test(texto)) campos.add("curso");
  if (/serie/.test(texto)) campos.add("serie");
  if (/institui/.test(texto)) campos.add("instituicao");
  if (/linkedin/.test(texto)) campos.add("linkedin");
  if (/aluno|professor|categoria/.test(texto)) campos.add("categoria");

  return Array.from(campos);
}

/**
 * Atributos ARIA para o campo, quando a mensagem de erro se refere a ele.
 * Devolve um objeto vazio quando não há relação, para uso com spread.
 */
export function atributosDeErro(
  campos: CampoComErro[],
  campo: CampoComErro,
  idErro: string,
  idAjuda?: string | null,
) {
  const invalido = campos.includes(campo);
  const descritoPor = [invalido ? idErro : null, idAjuda]
    .filter(Boolean)
    .join(" ");

  if (!invalido && !descritoPor) return {};

  return {
    ...(invalido ? { "aria-invalid": true as const } : {}),
    ...(descritoPor ? { "aria-describedby": descritoPor } : {}),
  };
}
