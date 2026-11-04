import { describe, expect, it } from "vitest";
import { rotuloPainel } from "@/lib/app-utils";

describe("rotuloPainel", () => {
  it("usa Administração para administradores", () => {
    expect(rotuloPainel(true)).toBe("Administração");
  });

  it("usa Organização para organizadores que não são admin", () => {
    expect(rotuloPainel(false)).toBe("Organização");
  });
});
