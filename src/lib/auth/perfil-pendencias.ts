export type DadosCadastro = {
  nome_completo: string | null;
  curso: string | null;
  ano_serie: string | null;
  instituicao: string | null;
  categoria: "aluno" | "externo" | "servidor" | "outro" | null;
};

/**
 * Campos que faltam para o cadastro do participante estar completo.
 *
 * O nome é sempre exigido. Curso e série/ano só fazem sentido para alunos da
 * escola; a instituição vale para todos. A lista alimenta o aviso mostrado na
 * área do participante logo depois do login.
 */
export function pendenciasCadastro(
  perfil: DadosCadastro | null,
): string[] {
  if (!perfil) {
    return ["nome completo", "curso", "série/ano", "instituição"];
  }

  const pendencias: string[] = [];

  if (
    !perfil.nome_completo?.trim() ||
    perfil.nome_completo.trim().length < 3
  ) {
    pendencias.push("nome completo");
  }

  if (perfil.categoria === "aluno") {
    if (!perfil.curso?.trim()) pendencias.push("curso");
    if (!perfil.ano_serie?.trim()) pendencias.push("série/ano");
  }

  if (!perfil.instituicao?.trim()) pendencias.push("instituição");

  return pendencias;
}

/** Monta a frase "Falta preencher: a, b e c." para o aviso. */
export function frasePendencias(pendencias: string[]): string {
  if (pendencias.length === 0) return "";
  if (pendencias.length === 1) return `Falta preencher: ${pendencias[0]}.`;

  return `Falta preencher: ${pendencias.slice(0, -1).join(", ")} e ${
    pendencias[pendencias.length - 1]
  }.`;
}
