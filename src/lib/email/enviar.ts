import "server-only";

export type MensagemEmail = {
  para: string;
  nome?: string | null;
  assunto: string;
  texto: string;
  html: string;
};

export type ResultadoEnvio =
  | { ok: true; provedor: "brevo" | "resend"; id: string | null }
  | { ok: false; motivo: "nao_configurado" | "falha"; erro?: string };

/**
 * Envio de e-mail transacional por API HTTP.
 *
 * O provedor é escolhido pelas variáveis de ambiente: `BREVO_API_KEY`
 * (tem prioridade) ou `RESEND_API_KEY`. Sem nenhuma das duas o envio é
 * ignorado com um aviso no log — a inscrição nunca falha por causa do e-mail.
 */
export function emailConfigurado() {
  return Boolean(chaveBrevo() || process.env.RESEND_API_KEY?.trim());
}

/**
 * Aceita tanto a API key crua (`xkeysib-...`) quanto o token do MCP do Brevo,
 * que é um JSON em base64 (`{"api_key":"xkeysib-..."}`).
 */
function chaveBrevo() {
  const bruta = process.env.BREVO_API_KEY?.trim();

  if (!bruta) return null;

  if (bruta.startsWith("eyJ")) {
    try {
      const dados = JSON.parse(
        Buffer.from(bruta, "base64").toString("utf8"),
      ) as { api_key?: unknown };

      if (typeof dados.api_key === "string" && dados.api_key.trim()) {
        return dados.api_key.trim();
      }
    } catch {
      // Não era base64: segue com o valor original.
    }
  }

  return bruta;
}

function remetente() {
  const email = process.env.EMAIL_REMETENTE?.trim();

  if (!email) return null;

  return {
    email,
    name: process.env.EMAIL_REMETENTE_NOME?.trim() || "Partiu DPM",
  };
}

export async function enviarEmail(
  mensagem: MensagemEmail,
): Promise<ResultadoEnvio> {
  const de = remetente();
  const brevo = chaveBrevo();
  const resend = process.env.RESEND_API_KEY?.trim();

  if (!de || (!brevo && !resend)) {
    console.warn(
      "[partiu-dpm] Envio de e-mail não configurado (EMAIL_REMETENTE e BREVO_API_KEY/RESEND_API_KEY).",
    );
    return { ok: false, motivo: "nao_configurado" };
  }

  try {
    if (brevo) {
      const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevo,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: de,
          to: [
            {
              email: mensagem.para,
              name: mensagem.nome?.trim() || undefined,
            },
          ],
          subject: mensagem.assunto,
          htmlContent: mensagem.html,
          textContent: mensagem.texto,
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.text().catch(() => "");
        console.error(
          "[partiu-dpm] Brevo recusou o e-mail:",
          resposta.status,
          corpo.slice(0, 500),
        );
        return { ok: false, motivo: "falha", erro: `brevo_${resposta.status}` };
      }

      const dados = (await resposta.json().catch(() => null)) as {
        messageId?: string;
      } | null;

      return { ok: true, provedor: "brevo", id: dados?.messageId ?? null };
    }

    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resend}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: `${de.name} <${de.email}>`,
        to: [mensagem.para],
        subject: mensagem.assunto,
        html: mensagem.html,
        text: mensagem.texto,
      }),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      console.error(
        "[partiu-dpm] Resend recusou o e-mail:",
        resposta.status,
        corpo.slice(0, 500),
      );
      return { ok: false, motivo: "falha", erro: `resend_${resposta.status}` };
    }

    const dados = (await resposta.json().catch(() => null)) as {
      id?: string;
    } | null;

    return { ok: true, provedor: "resend", id: dados?.id ?? null };
  } catch (erro) {
    console.error("[partiu-dpm] Falha de rede ao enviar e-mail.", erro);
    return { ok: false, motivo: "falha", erro: "rede" };
  }
}
