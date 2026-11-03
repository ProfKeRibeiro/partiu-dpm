import { describe, expect, it } from "vitest";
import {
  fraseParticipacao,
  percentualOcupacao,
  situacaoInscricao,
  textoVagas,
  vagasRestantes,
} from "@/lib/evento-utils";
import type { Evento } from "@/types/evento";

const agora = new Date("2026-11-03T12:00:00-03:00");

function evento(alteracoes: Partial<Evento> = {}): Evento {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    slug: null,
    titulo: "Evento de teste",
    descricao: "",
    tipo: "palestra",
    modalidade: "presencial",
    local: "Auditório",
    linkAcesso: null,
    inicio: "2026-11-10T19:00:00-03:00",
    fim: "2026-11-10T21:00:00-03:00",
    inscricoesInicio: null,
    inscricoesFim: null,
    limiteVagas: 10,
    inscritos: 3,
    publicoAlvo: "todos",
    cursosPermitidos: null,
    seriesPermitidas: null,
    status: "publicado",
    imagemUrl: null,
    corTema: null,
    ...alteracoes,
  };
}

describe("situacaoInscricao", () => {
  it("abre inscrições quando o evento é futuro e há vagas", () => {
    expect(situacaoInscricao(evento(), agora)).toBe("aberta");
  });

  it("marca em breve antes da abertura das inscrições", () => {
    expect(
      situacaoInscricao(
        evento({ inscricoesInicio: "2026-11-05T00:00:00-03:00" }),
        agora,
      ),
    ).toBe("em-breve");
  });

  it("encerra quando o evento já terminou", () => {
    expect(
      situacaoInscricao(
        evento({
          inicio: "2026-11-01T19:00:00-03:00",
          fim: "2026-11-01T21:00:00-03:00",
        }),
        agora,
      ),
    ).toBe("encerrada");
  });

  it("encerra quando o prazo de inscrição passou", () => {
    expect(
      situacaoInscricao(
        evento({ inscricoesFim: "2026-11-02T00:00:00-03:00" }),
        agora,
      ),
    ).toBe("encerrada");
  });

  it("marca lotado quando as vagas acabaram", () => {
    expect(
      situacaoInscricao(evento({ limiteVagas: 5, inscritos: 5 }), agora),
    ).toBe("lotado");
  });
});

describe("vagas e ocupação", () => {
  it("calcula vagas restantes sem ficar negativo", () => {
    expect(vagasRestantes(evento({ limiteVagas: 10, inscritos: 3 }))).toBe(7);
    expect(vagasRestantes(evento({ limiteVagas: 2, inscritos: 9 }))).toBe(0);
    expect(vagasRestantes(evento({ limiteVagas: null }))).toBeNull();
  });

  it("não calcula percentual sem limite de vagas", () => {
    expect(percentualOcupacao(evento({ limiteVagas: null }))).toBeNull();
    expect(percentualOcupacao(evento({ limiteVagas: 4, inscritos: 1 }))).toBe(
      25,
    );
  });

  it("escreve o texto de vagas nos casos de borda", () => {
    expect(textoVagas(evento({ limiteVagas: null }))).toBe(
      "Vagas conforme organização",
    );
    expect(textoVagas(evento({ limiteVagas: 1, inscritos: 1 }))).toBe(
      "Sem vagas disponíveis",
    );
    expect(textoVagas(evento({ limiteVagas: 2, inscritos: 1 }))).toBe(
      "1 vaga restante",
    );
    expect(textoVagas(evento({ limiteVagas: 10, inscritos: 3 }))).toBe(
      "7 vagas restantes",
    );
  });
});

describe("fraseParticipacao", () => {
  it("usa a preposição certa por tipo e cai no genérico", () => {
    expect(fraseParticipacao("palestra")).toBe("participou da palestra");
    expect(fraseParticipacao("curso")).toBe("participou do curso");
    expect(fraseParticipacao(" Oficina ")).toBe("participou da oficina");
    expect(fraseParticipacao("outro")).toBe("participou do evento");
  });
});
