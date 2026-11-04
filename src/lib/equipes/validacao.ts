/**
 * Validação do e-mail do professor orientador.
 *
 * Espelha a regra do servidor e do banco (`equipes_orientador_email_dominio`):
 * domínio exato `cps.sp.gov.br`, o que exclui `aluno.cps.sp.gov.br`.
 */
export const MENSAGEM_ORIENTADOR =
  "O orientador precisa ser professor com e-mail @cps.sp.gov.br.";

export function emailOrientadorValido(email: string) {
  const limpo = email.trim().toLowerCase();
  const separador = limpo.lastIndexOf("@");

  if (separador <= 0 || separador === limpo.length - 1) return false;

  return limpo.slice(separador + 1) === "cps.sp.gov.br";
}

export function emailEhDeAluno(email: string) {
  return /@aluno\.cps\.sp\.gov\.br$/i.test(email.trim());
}
