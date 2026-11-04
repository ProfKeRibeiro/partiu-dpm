import { describe, expect, it } from "vitest";
import { emailEhDeAluno, emailOrientadorValido } from "@/lib/equipes/validacao";
import { fraseParticipacao, rotuloTipo } from "@/lib/evento-utils";

describe("e-mail do orientador", () => {
  it("aceita domínio de professor @cps.sp.gov.br", () => {
    expect(emailOrientadorValido("professor@cps.sp.gov.br")).toBe(true);
    expect(emailOrientadorValido("  Maria.Silva@CPS.SP.GOV.BR ")).toBe(true);
  });

  it("recusa e-mail de aluno, domínio parecido e endereço inválido", () => {
    expect(emailOrientadorValido("aluno@aluno.cps.sp.gov.br")).toBe(false);
    expect(emailOrientadorValido("professor@cps.sp.gov.br.edu")).toBe(false);
    expect(emailOrientadorValido("professor@etec.sp.gov.br")).toBe(false);
    expect(emailOrientadorValido("sem-arroba")).toBe(false);
    expect(emailOrientadorValido("")).toBe(false);
  });

  it("identifica e-mail de aluno para a dica na interface", () => {
    expect(emailEhDeAluno("fulano@aluno.cps.sp.gov.br")).toBe(true);
    expect(emailEhDeAluno("professor@cps.sp.gov.br")).toBe(false);
  });
});

describe("tipos de evento de equipe", () => {
  it("rotula maratona e competição", () => {
    expect(rotuloTipo("maratona")).toBe("Maratona");
    expect(rotuloTipo("competicao")).toBe("Competição");
  });

  it("usa a frase certa no certificado", () => {
    expect(fraseParticipacao("maratona")).toBe("participou da maratona");
    expect(fraseParticipacao("competicao")).toBe("participou da competição");
  });
});
