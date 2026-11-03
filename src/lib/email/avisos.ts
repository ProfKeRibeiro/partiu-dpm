import "server-only";

import { siteUrl } from "@/lib/env";
import { rotuloTipo, ROTULOS_MODALIDADE } from "@/lib/evento-utils";
import { formatarPeriodo } from "@/lib/format";
import { enviarEmail, type ResultadoEnvio } from "@/lib/email/enviar";

export type AvisoTipo =
  | "inscrito"
  | "cancelado"
  | "lista_espera"
  | "presenca"
  | "certificado";

export type EventoDoEmail = {
  id: string;
  titulo: string;
  tipo: string;
  modalidade: string;
  local: string | null;
  inicio: string | null;
  fim: string | null;
};

export type DadosAviso = {
  nome: string;
  email: string;
  evento: EventoDoEmail;
  codigoValidacao?: string | null;
};

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

type TextosDoAviso = {
  assunto: string;
  titulo: string;
  faixa: string;
  abertura: (saudacao: string, evento: EventoDoEmail) => string;
  chamada: string;
  fechamento: string;
  botao: string;
  destino: string;
};

const TEXTOS: Record<AvisoTipo, TextosDoAviso> = {
  inscrito: {
    assunto: "Inscrição confirmada",
    titulo: "Inscrição confirmada",
    faixa: "#0f6b3f",
    abertura: (saudacao, evento) =>
      `Olá, ${saudacao}! Sua inscrição em "${evento.titulo}" está confirmada.`,
    chamada: "Anote os detalhes e chegue com alguns minutos de antecedência.",
    fechamento: "Nos vemos lá! Te espero no evento.",
    botao: "Ver o evento",
    destino: "evento",
  },
  cancelado: {
    assunto: "Inscrição cancelada",
    titulo: "Inscrição cancelada",
    faixa: "#8a3b2e",
    abertura: (saudacao, evento) =>
      `Olá, ${saudacao}. Sua inscrição em "${evento.titulo}" foi cancelada.`,
    chamada:
      "Se mudar de ideia, você pode se inscrever de novo enquanto houver vagas.",
    fechamento: "Que pena que você não vai desta vez. Te aguardamos no próximo evento!",
    botao: "Ver outros eventos",
    destino: "evento",
  },
  lista_espera: {
    assunto: "Você está na lista de espera",
    titulo: "Lista de espera",
    faixa: "#8a5a1e",
    abertura: (saudacao, evento) =>
      `Olá, ${saudacao}! Você entrou na lista de espera de "${evento.titulo}".`,
    chamada:
      "Se uma vaga abrir, a organização confirma sua inscrição e avisa por aqui e por e-mail.",
    fechamento: "Fique de olho no seu e-mail — pode dar certo!",
    botao: "Acompanhar inscrições",
    destino: "inscricoes",
  },
  presenca: {
    assunto: "Presença confirmada",
    titulo: "Presença confirmada",
    faixa: "#0f6b3f",
    abertura: (saudacao, evento) =>
      `Olá, ${saudacao}! Sua presença em "${evento.titulo}" foi registrada.`,
    chamada:
      "O certificado fica disponível na sua conta assim que a organização emitir.",
    fechamento: "Obrigado por participar! Foi ótimo ter você no evento.",
    botao: "Minha área",
    destino: "conta",
  },
  certificado: {
    assunto: "Seu certificado está disponível",
    titulo: "Certificado disponível",
    faixa: "#0f6b3f",
    abertura: (saudacao, evento) =>
      `Olá, ${saudacao}! Seu certificado de "${evento.titulo}" já pode ser baixado.`,
    chamada:
      "O arquivo fica na área do participante e traz um código de validação para conferir a autenticidade.",
    fechamento: "Parabéns pela participação! Guarde seu certificado com carinho.",
    botao: "Baixar certificado",
    destino: "certificados",
  },
};

/**
 * Aviso automático do sistema por e-mail.
 *
 * O tom muda conforme o tipo: boas-vindas na inscrição, mensagem gentil no
 * cancelamento, aviso de espera, confirmação de presença e certificado pronto.
 */
export async function enviarAvisoEvento(params: {
  tipo: AvisoTipo;
  dados: DadosAviso;
}): Promise<ResultadoEnvio> {
  const { tipo, dados } = params;
  const { evento } = dados;
  const texto = TEXTOS[tipo];
  const saudacao = primeiroNome(dados.nome) || "participante";
  const assunto = `${texto.assunto}: ${evento.titulo}`;

  const urlEvento = `${siteUrl}/eventos/${evento.id}`;
  const urlConta = `${siteUrl}/conta/inscricoes`;
  const urlCertificados = `${siteUrl}/conta/certificados`;

  const destino =
    texto.destino === "inscricoes"
      ? urlConta
      : texto.destino === "certificados"
        ? urlCertificados
        : texto.destino === "conta"
          ? `${siteUrl}/conta`
          : urlEvento;

  const linhas = detalhesDoEvento(evento);

  if (tipo === "certificado" && dados.codigoValidacao) {
    linhas.push(["Código de validação", dados.codigoValidacao]);
  }

  const abertura = texto.abertura(saudacao, evento);

  const corpo = [
    abertura,
    "",
    ...linhas.map(([rotulo, valor]) => `${rotulo}: ${valor}`),
    "",
    texto.chamada,
    texto.fechamento,
    "",
    `Detalhes: ${destino}`,
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
                <div style="font-size:20px;font-weight:700;margin-top:4px;">${escapar(texto.titulo)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 8px;font-size:16px;color:#082237;font-weight:600;">Olá, ${escapar(saudacao)}!</p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3d4d5c;">${escapar(abertura)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  ${linhasHtml}
                </table>
                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#3d4d5c;">${escapar(texto.chamada)}</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${texto.faixa};font-weight:700;">${escapar(texto.fechamento)}</p>
                <p style="margin:0;">
                  <a href="${destino}" style="display:inline-block;background:#082237;color:#f7f4ef;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:999px;">${escapar(texto.botao)}</a>
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
    para: dados.email,
    nome: dados.nome,
    assunto,
    texto: corpo,
    html,
  });
}
