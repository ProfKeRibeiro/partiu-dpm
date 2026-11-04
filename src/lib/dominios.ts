/**
 * Domínios institucionais usados nas regras de cadastro.
 *
 * `aluno.cps.sp.gov.br` é o e-mail do aluno da Etec: ele não precisa de
 * consentimento de responsável. `cps.sp.gov.br` (sem o prefixo `aluno`) é o
 * e-mail de professor/coordenador.
 */
export function emailDeAlunoEtec(email: string | null | undefined) {
  if (typeof email !== "string") return false;

  return email.trim().toLowerCase().endsWith("@aluno.cps.sp.gov.br");
}
