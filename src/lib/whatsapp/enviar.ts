import "server-only";

import { siteUrl } from "@/lib/env";

export type ResultadoEnvioWhatsApp =
  | { ok: true; provedor: "whatsapp"; id: string | null }
  | { ok: false; motivo: "nao_configurado" | "falha"; erro?: string };

export type EnviarConsentimentoWhatsAppParams = {
  para: string;
  nomeTitular?: string | null;
  token: string;
};

/**
 * Envio de link de aceite do responsável por WhatsApp (Meta WhatsApp Cloud API).
 *
 * Segue o padrão do `enviarEmail`: sem as variáveis de ambiente
 * (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_CONSENTIMENTO`)
 * o envio é ignorado com aviso no log — a inscrição nunca falha por causa do WhatsApp.
 */
export function whatsappConfigurado() {
  return Boolean(
    process.env.WHATSAPP_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() &&
      process.env.WHATSAPP_TEMPLATE_CONSENTIMENTO?.trim(),
  );
}

/**
 * Normaliza telefone para E.164 (Brasil): +55 DDD + número.
 * Aceita com ou sem o código do país (55) e descarta caracteres não numéricos.
 */
export function normalizarTelefoneWhatsApp(
  valor: string | null | undefined,
): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;

  const numero = digitos.startsWith("55")
    ? `+55${digitos.slice(2)}`
    : `+55${digitos}`;

  return /^\+55[1-9][0-9]{9}$/.test(numero) ? numero : null;
}

async function enviarComRetentativa(url: string, init: RequestInit) {
  const primeira = await fetch(url, init);

  if (primeira.status < 500 && primeira.status !== 429) return primeira;

  await new Promise((resolver) => setTimeout(resolver, 400));

  return fetch(url, init);
}

/**
 * Envia o template de consentimento com o link de aceite (?decisao=aceitar).
 */
export async function enviarConsentimentoWhatsApp(
  params: EnviarConsentimentoWhatsAppParams,
): Promise<ResultadoEnvioWhatsApp> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const template = process.env.WHATSAPP_TEMPLATE_CONSENTIMENTO?.trim();
  const idioma = process.env.WHATSAPP_IDIOMA?.trim() || "pt_BR";

  if (!token || !phoneNumberId || !template) {
    console.warn(
      "[partiu-dpm] Envio de WhatsApp não configurado (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_CONSENTIMENTO).",
    );
    return { ok: false, motivo: "nao_configurado" };
  }

  const para = normalizarTelefoneWhatsApp(params.para);

  if (!para) {
    return { ok: false, motivo: "nao_configurado", erro: "telefone_invalido" };
  }

  const link = `${siteUrl}/consentimento/${params.token}?decisao=aceitar`;

  try {
    const resposta = await enviarComRetentativa(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: para,
          template: {
            name: template,
            language: { code: idioma },
          },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: link }],
            },
          ],
        }),
      },
    );

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      console.error(
        "[partiu-dpm] Meta recusou o WhatsApp:",
        resposta.status,
        corpo.slice(0, 500),
      );
      return { ok: false, motivo: "falha", erro: `whatsapp_${resposta.status}` };
    }

    const dados = (await resposta.json().catch(() => null)) as {
      messages?: Array<{ id?: string }>;
    } | null;

    return { ok: true, provedor: "whatsapp", id: dados?.messages?.[0]?.id ?? null };
  } catch (erro) {
    console.error("[partiu-dpm] Falha de rede ao enviar WhatsApp.", erro);
    return { ok: false, motivo: "falha", erro: "rede" };
  }
}
