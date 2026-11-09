import { describe, expect, it } from "vitest";
import {
  frasePendencias,
  pendenciasCadastro,
  type DadosCadastro,
} from "@/lib/auth/perfil-pendencias";

function perfil(overrides: Partial<DadosCadastro>): DadosCadastro {
  return {
    nome_completo: "Ana Souza",
    curso: "Informática para Internet",
    ano_serie: "2º",
    instituicao: "ETEC Darcy Pereira de Moraes",
    categoria: "aluno",
    ...overrides,
  };
}

describe("pendenciasCadastro", () => {
  it("não aponta pendências quando o cadastro está completo", () => {
    expect(pendenciasCadastro(perfil({}))).toEqual([]);
  });

  it("exige curso e série para aluno", () => {
    expect(
      pendenciasCadastro(perfil({ curso: null, ano_serie: "  " })),
    ).toEqual(["curso", "série/ano"]);
  });

  it("não exige curso e série para externo", () => {
    expect(
      pendenciasCadastro(
        perfil({
          categoria: "externo",
          curso: null,
          ano_serie: null,
        }),
      ),
    ).toEqual([]);
  });

  it("exige instituição e nome válido", () => {
    expect(
      pendenciasCadastro(
        perfil({ nome_completo: " A ", instituicao: null }),
      ),
    ).toEqual(["nome completo", "instituição"]);
  });

  it("trata perfil inexistente como cadastro em branco", () => {
    expect(pendenciasCadastro(null)).toEqual([
      "nome completo",
      "curso",
      "série/ano",
      "instituição",
    ]);
  });
});

describe("frasePendencias", () => {
  it("lista os campos com vírgula e e", () => {
    expect(frasePendencias(["curso", "série/ano", "instituição"])).toBe(
      "Falta preencher: curso, série/ano e instituição.",
    );
  });

  it("usa singular com um campo", () => {
    expect(frasePendencias(["curso"])).toBe("Falta preencher: curso.");
  });
});
