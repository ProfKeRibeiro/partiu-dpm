import QRCode from "qrcode";
import { siteUrl } from "@/lib/env";

/**
 * Caixa do modelo oficial (1754×1240). As coordenadas foram medidas sobre o
 * PNG: a moldura vermelha fica em ~x 82–296, y 882–1078 e o QR ocupa a área
 * interna (x 92–290, y 893–1066) com folga.
 */
const POSICAO_CAIXA = { x: 109, y: 897, tamanho: 164 };

/**
 * URL completa da página de validação para um código. Prefere
 * `NEXT_PUBLIC_SITE_URL` e cai para a origem do pedido (útil em preview e
 * localhost) quando a variável não está configurada.
 */
export function urlValidacaoCertificado(request: Request, codigo: string) {
  if (siteUrl !== "http://localhost:3000") {
    return `${siteUrl}/certificados/${codigo}`;
  }

  return `${new URL(request.url).origin}/certificados/${codigo}`;
}

export type QrEmbed = { conteudo: string; escala: number };

/**
 * Gera o miolo de um SVG de QR code pronto para embutir no certificado.
 *
 * O `qrcode` entrega um `<svg viewBox="0 0 n n">` com um único `<path>` em
 * unidades de módulo. Como o certificado é desenhado em 1754×1240, o miolo é
 * re-escalonado para a caixa do modelo.
 */
export async function gerarQrDoCertificado(
  conteudoUrl: string,
): Promise<QrEmbed | null> {
  try {
    const svg = await QRCode.toString(conteudoUrl, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#062d47", light: "#00000000" },
    });

    const caixa = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const modulos = caixa ? Number(caixa[1]) : 0;
    if (!modulos) return null;

    const miolo = svg
      .replace(/^<svg[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "")
      .trim();

    if (!miolo) return null;

    return {
      conteudo: miolo,
      escala: POSICAO_CAIXA.tamanho / modulos,
    };
  } catch (erro) {
    console.error("[partiu-dpm] Falha ao gerar o QR de validação.", erro);
    return null;
  }
}

export const caixaQr = POSICAO_CAIXA;
