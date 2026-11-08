import { describe, expect, it } from "vitest";
import {
  mapearCartaoParticipacao,
  podeGerarCartaoParticipacao,
  type CartaoParticipacao,
} from "@/lib/participantes/cartao";

function cartao(overrides: Partial<CartaoParticipacao>): CartaoParticipacao {
  return {
    ok: false,
    motivo: null,
    nome: null,
    evento: null,
    avatarPath: null,
    autorizaImagem: false,
    ...overrides,
  };
}

describe("mapearCartaoParticipacao", () => {
  it("mapeia nome, evento, avatar e consentimento de imagem", () => {
    const dados = mapearCartaoParticipacao({
      ok: true,
      nome: "Ana Souza",
      evento: "Palestra de Início",
      avatar_path: "avatars/ana.png",
      autoriza_imagem: true,
    });

    expect(dados).toEqual({
      ok: true,
      motivo: null,
      nome: "Ana Souza",
      evento: "Palestra de Início",
      avatarPath: "avatars/ana.png",
      autorizaImagem: true,
    });
  });

  it("bloqueia o card quando o payload não é válido", () => {
    const dados = mapearCartaoParticipacao({ ok: false, motivo: "nao_autenticado" });

    expect(dados.ok).toBe(false);
    expect(dados.autorizaImagem).toBe(false);
  });
});

describe("podeGerarCartaoParticipacao", () => {
  it("libera o card quando o participante autorizou o uso da imagem", () => {
    expect(
      podeGerarCartaoParticipacao(cartao({ ok: true, autorizaImagem: true })),
    ).toBe(true);
  });

  it("bloqueia o card quando autoriza_imagem é false", () => {
    expect(
      podeGerarCartaoParticipacao(cartao({ ok: true, autorizaImagem: false })),
    ).toBe(false);
  });
});
