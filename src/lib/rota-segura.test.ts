import { describe, expect, it } from "vitest";
import { destinoSeguroInterno } from "@/lib/rota-segura";

describe("destinoSeguroInterno", () => {
  it("mantém caminhos internos permitidos", () => {
    expect(destinoSeguroInterno("/conta")).toBe("/conta");
    expect(destinoSeguroInterno("/admin/eventos/123?aba=inscritos")).toBe(
      "/admin/eventos/123?aba=inscritos",
    );
    expect(destinoSeguroInterno("/eventos")).toBe("/eventos");
  });

  it("cai no padrão quando o valor não é um caminho interno conhecido", () => {
    expect(destinoSeguroInterno(undefined)).toBe("/conta");
    expect(destinoSeguroInterno("")).toBe("/conta");
    expect(destinoSeguroInterno("https://evil.com")).toBe("/conta");
    expect(destinoSeguroInterno("//evil.com/conta")).toBe("/conta");
    expect(destinoSeguroInterno("/rota-inexistente")).toBe("/conta");
    expect(destinoSeguroInterno("/contas")).toBe("/conta");
  });

  it("rejeita open redirect com barra invertida e credenciais", () => {
    expect(destinoSeguroInterno("/\\evil.com")).toBe("/conta");
    expect(destinoSeguroInterno("/%5cevil.com")).toBe("/conta");
    expect(destinoSeguroInterno("https://user:pass@interno.invalid/conta")).toBe(
      "/conta",
    );
  });

  it("respeita um padrão alternativo", () => {
    expect(destinoSeguroInterno("https://evil.com", "/")).toBe("/");
  });
});
