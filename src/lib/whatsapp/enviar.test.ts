import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  enviarConsentimentoWhatsApp,
  normalizarTelefoneWhatsApp,
  whatsappConfigurado,
} from "@/lib/whatsapp/enviar";

describe("normalizarTelefoneWhatsApp", () => {
  it("normaliza telefone brasileiro com DDD para E.164", () => {
    expect(normalizarTelefoneWhatsApp("1198765432")).toBe("+551198765432");
  });

  it("aceita telefone com o código do país (55)", () => {
    expect(normalizarTelefoneWhatsApp("551198765432")).toBe("+551198765432");
  });

  it("retorna null para telefone vazio ou muito curto", () => {
    expect(normalizarTelefoneWhatsApp("")).toBeNull();
    expect(normalizarTelefoneWhatsApp("123")).toBeNull();
  });
});

describe("enviarConsentimentoWhatsApp", () => {
  it("retorna nao_configurado quando as variáveis do Meta não estão definidas", async () => {
    delete process.env.WHATSAPP_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_TEMPLATE_CONSENTIMENTO;
    delete process.env.WHATSAPP_IDIOMA;

    expect(whatsappConfigurado()).toBe(false);

    const resultado = await enviarConsentimentoWhatsApp({
      para: "1198765432",
      token: "token-teste",
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok === false) {
      expect(resultado.motivo).toBe("nao_configurado");
    }
  });

  it("retorna motivo de falha para telefone fora do padrão E.164 válido", async () => {
    process.env.WHATSAPP_TOKEN = "token-teste";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-number-id-teste";
    process.env.WHATSAPP_TEMPLATE_CONSENTIMENTO = "template_consentimento";
    delete process.env.WHATSAPP_IDIOMA;

    const resultado = await enviarConsentimentoWhatsApp({
      para: "123",
      token: "token-teste",
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok === false) {
      expect(resultado.motivo).toBe("nao_configurado");
      expect(resultado.erro).toBe("telefone_invalido");
    }
  });
});
