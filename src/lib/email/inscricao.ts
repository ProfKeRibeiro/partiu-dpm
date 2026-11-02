import "server-only";

import { siteUrl } from "@/lib/env";
import { rotuloTipo, ROTULOS_MODALIDADE } from "@/lib/evento-utils";
import { formatarPeriodo } from "@/lib/format";
import { enviarEmail, type ResultadoEnvio } from "@/lib/email/enviar";

export type EventoDoEmail = {
  id: string;
  titulo: string;
  tipo: string;
  modalidade: string;
  local: string | null;
  inicio: string | null;
  fim: string | null;
};

export type AvisoInscricao = "inscrito" | "cancelado";

function escapar(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function primeiroNome(nome: string) {
  const limpo = nome.trim();

  if (!limpo) return "";

  const primeiro = limpo.split(/\s+/)[0] ?? "";
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
}

function detalhesDoEvento(evento: EventoDoEmail) {
  const modalidade =
    ROTULOS_MODALIDADE[evento.modalidade as keyof typeof ROTULOS_MODALIDADE] ??
    evento.modalidade;

  const linhas: Array<[string, string]> = [
    ["Evento", evento.titulo],
    ["Tipo", rotuloTipo(evento.tipo)],
    [
      "Quando",
      evento.inicio
        ? formatarPeriodo(evento.inicio, evento.fim)
        : "Consulte a organização",
    ],
    ["Modalidade", modalidade],
  ];

  if (evento.local?.trim()) {
    linhas.push(["Local", evento.local.trim()]);
  } else if (evento.modalidade === "online") {
    linhas.push(["Local", "Online — o link de acesso fica na página do evento"]);
  }

  return linhas;
}

/**
 * Aviso de inscrição confirmada ou cancelada.
 *
 * O texto muda de tom conforme o caso: quem entra recebe boas-vindas e um
 * "te espero lá"; quem cancela recebe uma mensagem gentil e o convite para o
 * próximo evento.
 */
export async function enviarEmailInscricao(params: {
  tipo: AvisoInscricao;
  para: string;
  nome: string;
  evento: EventoDoEmail;
}): Promise<ResultadoEnvio> {
  const { tipo, para, nome, evento } = params;
  const saudacao = primeiroNome(nome) || "participante";
  const confirmado = tipo === "inscrito";

  const assunto = confirmado
    ? `Inscrição confirmada: ${evento.titulo}`
    : `Inscrição cancelada: ${evento.titulo}`;

  const abertura = confirmado
    ? `Olá, ${saudacao}! Sua inscrição em "${evento.titulo}" está confirmada.`
    : `Olá, ${saudacao}. Sua inscrição em "${evento.titulo}" foi cancelada.`;

  const fechamento = confirmado
    ? "Nos vemos lá! Te espero no evento."
    : "Que pena que você não vai desta vez. Te aguardamos no próximo evento!";

  const chamada = confirmado
    ? "Anote os detalhes e chegue com alguns minutos de antecedência."
    : "Se mudar de ideia, você pode se inscrever de novo enquanto houver vagas.";

  const linhas = detalhesDoEvento(evento);
  const urlEvento = `${siteUrl}/eventos/${evento.id}`;
  const urlConta = `${siteUrl}/conta/inscricoes`;

  const texto = [
    abertura,
    "",
    ...linhas.map(([rotulo, valor]) => `${rotulo}: ${valor}`),
    "",
    chamada,
    fechamento,
    "",
    `Página do evento: ${urlEvento}`,
    `Minhas inscrições: ${urlConta}`,
    "",
    "Partiu DPM",
  ].join("\n");

  const linhasHtml = linhas
    .map(
      ([rotulo, valor]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e6e9ee;font-size:13px;color:#5b6b7c;width:130px;vertical-align:top;">${escapar(rotulo)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e6e9ee;font-size:14px;color:#082237;font-weight:600;">${escapar(valor)}</td>
        </tr>`,
    )
    .join("");

  const faixa = confirmado ? "#0f6b3f" : "#8a3b2e";

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f7f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e9ee;">
            <tr>
              <td style="background:#082237;padding:22px 28px;color:#f7f4ef;">
                <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#b9c7d4;">Partiu DPM</div>
                <div style="font-size:20px;font-weight:700;margin-top:4px;">${confirmado ? "Inscrição confirmada" : "Inscrição cancelada"}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 8px;font-size:16px;color:#082237;font-weight:600;">Olá, ${escapar(saudacao)}!</p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3d4d5c;">${escapar(abertura)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  ${linhasHtml}
                </table>
                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#3d4d5c;">${escapar(chamada)}</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${faixa};font-weight:700;">${escapar(fechamento)}</p>
                <p style="margin:0;">
                  <a href="${urlEvento}" style="display:inline-block;background:#082237;color:#f7f4ef;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:999px;">${confirmado ? "Ver o evento" : "Ver outros eventos"}</a>
                </p>
                <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#6b7c8c;">
                  Você pode revisar suas inscrições em
                  <a href="${urlConta}" style="color:#8a3b2e;">partiu-dpm</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f1efe9;font-size:11px;line-height:1.6;color:#6b7c8c;">
                Você recebeu este e-mail porque usou o portal Partiu DPM.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return enviarEmail({
    para,
    nome,
    assunto,
    texto,
    html,
  });
}
