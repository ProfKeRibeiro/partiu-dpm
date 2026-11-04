import "server-only";

import { siteUrl } from "@/lib/env";
import { obterCargaHorariaEmHoras } from "@/lib/certificados/consultas";
import { ROTULOS_MODALIDADE } from "@/lib/evento-utils";
import { formatarDataCurta, formatarDataHora, formatarHorario } from "@/lib/format";
import { enviarEmail, type ResultadoEnvio } from "@/lib/email/enviar";

export type AvisoTipo =
  | "inscrito"
  | "cancelado"
  | "lista_espera"
  | "convite"
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
  prazo?: string | null;
  posicao?: number | null;
};

/* Identidade visual dos e-mails: vermelho escuro no cabeçalho, vermelho nos
 * destaques e botões, fundo cinza claro e conteúdo em cartão branco. */
const COR_CABECALHO = "#780000";
const COR_DESTAQUE = "#C1121F";
const COR_FUNDO = "#F5F5F5";
const COR_TEXTO = "#1F2933";
const COR_SUAVE = "#5B6773";
const COR_LINHA = "#E5E5E5";

function escapar(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escapa o texto e envolve em `<strong>` a primeira ocorrência do trecho.
 *
 * Diferente de `escapar(texto).replace(escapar(trecho), ...)`, funciona com
 * títulos que contêm `&`, `<`, `>` ou aspas, porque compara o texto original.
 */
function destacar(texto: string, trecho: string) {
  const alvo = trecho.trim();
  const indice = alvo ? texto.indexOf(alvo) : -1;

  if (indice === -1) return escapar(texto);

  return [
    escapar(texto.slice(0, indice)),
    `<strong>${escapar(alvo)}</strong>`,
    escapar(texto.slice(indice + alvo.length)),
  ].join("");
}

function primeiroNome(nome: string) {
  const limpo = nome.trim();

  if (!limpo) return "";

  const primeiro = limpo.split(/\s+/)[0] ?? "";
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
}

function dataDoEvento(evento: EventoDoEmail) {
  return evento.inicio ? formatarDataCurta(evento.inicio) : "A definir";
}

function horarioDoEvento(evento: EventoDoEmail) {
  if (!evento.inicio) return "A definir";
  if (!evento.fim) return formatarHorario(evento.inicio);

  return `${formatarHorario(evento.inicio)} às ${formatarHorario(evento.fim)}`;
}

function modalidadeDoEvento(evento: EventoDoEmail) {
  return (
    ROTULOS_MODALIDADE[evento.modalidade as keyof typeof ROTULOS_MODALIDADE] ??
    evento.modalidade
  );
}

function localDoEvento(evento: EventoDoEmail) {
  if (evento.local?.trim()) return evento.local.trim();
  if (evento.modalidade === "online") return "Online";
  return "A definir";
}

type Aviso = {
  assunto: string;
  titulo: string;
  abertura: (evento: EventoDoEmail) => string;
  linhas: (dados: DadosAviso) => Array<[string, string]>;
  paragrafos: string[];
  fechamento: string;
  botao: string;
  url: string;
};

const AVISOS: Record<AvisoTipo, (dados: DadosAviso) => Aviso> = {
  inscrito: (dados) => ({
    assunto: `Inscrição confirmada em ${dados.evento.titulo}`,
    titulo: "Inscrição confirmada",
    abertura: (evento) =>
      `Sua inscrição foi realizada com sucesso. Você está confirmado(a) no evento ${evento.titulo}.`,
    linhas: (d) => [
      ["Data", dataDoEvento(d.evento)],
      ["Horário", horarioDoEvento(d.evento)],
      ["Modalidade", modalidadeDoEvento(d.evento)],
      ["Local", localDoEvento(d.evento)],
    ],
    paragrafos: [
      "Guarde essas informações e fique atento(a) às próximas orientações.",
      "Você pode acompanhar suas inscrições e consultar os detalhes do evento acessando o Partiu DPM.",
    ],
    fechamento: "Esperamos você!",
    botao: "Acessar minhas inscrições",
    url: `${siteUrl}/conta/inscricoes`,
  }),
  cancelado: (dados) => ({
    assunto: `Cancelamento de inscrição – ${dados.evento.titulo}`,
    titulo: "Inscrição cancelada",
    abertura: (evento) =>
      `Informamos que sua inscrição no evento ${evento.titulo} foi cancelada.`,
    linhas: (d) => [
      ["Evento", d.evento.titulo],
      ["Data", dataDoEvento(d.evento)],
      ["Status", "Cancelada"],
    ],
    paragrafos: [
      "Se o cancelamento foi solicitado por você, não é necessário realizar nenhuma outra ação.",
      "Caso não reconheça essa alteração ou tenha dúvidas, entre em contato com a organização do evento.",
      "Você pode consultar suas inscrições pelo portal Partiu DPM.",
    ],
    fechamento: "Esperamos você em um próximo evento!",
    botao: "Acessar o Partiu DPM",
    url: `${siteUrl}/conta/inscricoes`,
  }),
  lista_espera: (dados) => ({
    assunto: `Você está na lista de espera – ${dados.evento.titulo}`,
    titulo: "Você está na lista de espera",
    abertura: (evento) =>
      `Recebemos sua inscrição para o evento ${evento.titulo}. No momento, todas as vagas disponíveis estão preenchidas, por isso sua inscrição foi registrada na lista de espera.`,
    linhas: (d) => {
      const base: Array<[string, string]> = [
        ["Evento", d.evento.titulo],
        ["Data", dataDoEvento(d.evento)],
        ["Horário", horarioDoEvento(d.evento)],
        ["Status", "Lista de espera"],
      ];

      if (d.posicao) {
        base.push(["Posição na fila", `${d.posicao}º`]);
      }

      return base;
    },
    paragrafos: [
      "Caso uma vaga seja disponibilizada, você poderá receber uma notificação sobre a possibilidade de confirmação da inscrição.",
      "Fique atento(a) ao seu e-mail!",
    ],
    fechamento: "Obrigado pelo interesse!",
    botao: "Acompanhar minha inscrição",
    url: `${siteUrl}/conta/inscricoes`,
  }),
  convite: (dados) => ({
    assunto: `Surgiu uma vaga – ${dados.evento.titulo}`,
    titulo: "Surgiu uma vaga para você",
    abertura: (evento) =>
      `Uma vaga abriu em ${evento.titulo} e ela está reservada para você.`,
    linhas: (d) => {
      const base: Array<[string, string]> = [
        ["Evento", d.evento.titulo],
        ["Data", dataDoEvento(d.evento)],
        ["Horário", horarioDoEvento(d.evento)],
        ["Modalidade", modalidadeDoEvento(d.evento)],
        ["Local", localDoEvento(d.evento)],
      ];

      if (d.prazo) {
        base.push(["Confirme até", formatarDataHora(d.prazo)]);
      }

      return base;
    },
    paragrafos: [
      "Sua vaga fica reservada só até o prazo acima. Se ele passar sem confirmação, a vaga vai automaticamente para a próxima pessoa da lista de espera.",
      "Confirme na área do participante em um clique.",
    ],
    fechamento: "Não deixe para depois — essa vaga pode ser sua!",
    botao: "Confirmar minha vaga",
    url: `${siteUrl}/conta/inscricoes`,
  }),
  presenca: (dados) => ({
    assunto: `Presença confirmada – ${dados.evento.titulo}`,
    titulo: "Presença confirmada",
    abertura: (evento) =>
      `Sua presença no evento ${evento.titulo} foi registrada pela organização.`,
    linhas: (d) => [
      ["Evento", d.evento.titulo],
      ["Data", dataDoEvento(d.evento)],
      ["Horário", horarioDoEvento(d.evento)],
      ["Status", "Presença registrada"],
    ],
    paragrafos: [
      "O certificado fica disponível na sua conta assim que a organização emitir.",
    ],
    fechamento: "Obrigado por participar!",
    botao: "Acessar o Partiu DPM",
    url: `${siteUrl}/conta`,
  }),
  certificado: (dados) => ({
    assunto: `Seu certificado está disponível! – ${dados.evento.titulo}`,
    titulo: "Seu certificado está disponível",
    abertura: (evento) =>
      `Temos uma novidade: seu certificado de participação no evento ${evento.titulo} já está disponível!`,
    linhas: (d) => {
      const carga = obterCargaHorariaEmHoras(d.evento.inicio, d.evento.fim);
      const base: Array<[string, string]> = [
        ["Evento", d.evento.titulo],
        ["Participante", d.nome || "—"],
        ["Carga horária", carga ? `${carga} horas` : "Conforme o evento"],
        ["Data de realização", dataDoEvento(d.evento)],
      ];

      if (d.codigoValidacao) {
        base.push(["Código de validação", d.codigoValidacao]);
      }

      return base;
    },
    paragrafos: [
      "Você pode acessar, visualizar e baixar seu certificado diretamente pelo Partiu DPM.",
    ],
    fechamento: "Parabéns pela participação e por investir no seu aprendizado!",
    botao: "Acessar meus certificados",
    url: `${siteUrl}/conta/certificados`,
  }),
};

/**
 * Monta assunto, texto puro e HTML de um aviso, sem enviar.
 *
 * Separado do envio para permitir conferir o conteúdo (e reutilizar o modelo)
 * sem depender do provedor de e-mail.
 */
export function montarAvisoEmail(params: {
  tipo: AvisoTipo;
  dados: DadosAviso;
}): { assunto: string; texto: string; html: string } {
  const { tipo, dados } = params;
  const aviso = AVISOS[tipo](dados);
  const saudacao = primeiroNome(dados.nome) || "participante";
  const abertura = aviso.abertura(dados.evento);
  const linhas = aviso.linhas(dados);
  const preheader = `${aviso.titulo} — ${dados.evento.titulo}`.slice(0, 140);

  const texto = [
    `Olá, ${saudacao}!`,
    abertura,
    "",
    ...linhas.map(([rotulo, valor]) => `${rotulo}: ${valor}`),
    "",
    ...aviso.paragrafos,
    "",
    `${aviso.botao}: ${aviso.url}`,
    "",
    aviso.fechamento,
    "",
    "Equipe Partiu DPM",
    "Etec DPM",
    "Contato: e261dir@cps.sp.gov.br",
  ].join("\n");

  const linhasHtml = linhas
    .map(
      ([rotulo, valor]) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid ${COR_LINHA};font-size:13px;color:${COR_SUAVE};width:150px;vertical-align:top;">${escapar(rotulo)}</td>
                  <td style="padding:10px 0;border-bottom:1px solid ${COR_LINHA};font-size:14px;color:${COR_TEXTO};font-weight:600;">${escapar(valor)}</td>
                </tr>`,
    )
    .join("");

  const paragrafosHtml = aviso.paragrafos
    .map(
      (paragrafo) =>
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:${COR_TEXTO};">${escapar(paragrafo)}</p>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:${COR_FUNDO};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapar(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR_FUNDO};padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8E8E8;">
            <tr>
              <td style="background:${COR_CABECALHO};padding:26px 30px;">
                <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#F3C6C6;">Partiu DPM</div>
                <div style="font-size:21px;font-weight:700;margin-top:6px;color:#FFFFFF;">${escapar(aviso.titulo)}</div>
              </td>
            </tr>
            <tr>
              <td style="height:4px;background:${COR_DESTAQUE};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 30px 24px;">
                <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:${COR_CABECALHO};">Olá, ${escapar(saudacao)}!</p>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:${COR_TEXTO};">${destacar(abertura, dados.evento.titulo)}</p>
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${COR_DESTAQUE};">Detalhes</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
                  ${linhasHtml}
                </table>
                ${paragrafosHtml}
                <p style="margin:4px 0 22px;font-size:15px;line-height:1.6;color:${COR_DESTAQUE};font-weight:700;">${escapar(aviso.fechamento)}</p>
                <p style="margin:0;">
                  <a href="${aviso.url}" style="display:inline-block;background:${COR_DESTAQUE};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;border-radius:8px;">${escapar(aviso.botao)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px;background:${COR_FUNDO};border-top:1px solid ${COR_LINHA};">
                <p style="margin:0;font-size:13px;font-weight:700;color:${COR_CABECALHO};">Equipe Partiu DPM</p>
                <p style="margin:4px 0 0;font-size:12px;color:${COR_SUAVE};">Etec DPM — Escola Técnica Estadual</p>
                <p style="margin:4px 0 0;font-size:12px;color:${COR_SUAVE};">Contato: <a href="mailto:e261dir@cps.sp.gov.br" style="color:${COR_SUAVE};">e261dir@cps.sp.gov.br</a></p>
                <p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:${COR_SUAVE};">Você recebeu este e-mail porque usou o portal Partiu DPM.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { assunto: aviso.assunto, texto, html };
}

/**
 * Aviso automático do sistema por e-mail.
 *
 * O texto segue os modelos definidos pela Etec DPM: saudação pelo primeiro
 * nome, detalhes do evento em tabela, botão de ação e assinatura da equipe.
 */
export async function enviarAvisoEvento(params: {
  tipo: AvisoTipo;
  dados: DadosAviso;
}): Promise<ResultadoEnvio> {
  const { assunto, texto, html } = montarAvisoEmail(params);

  return enviarEmail({
    para: params.dados.email,
    nome: params.dados.nome,
    assunto,
    texto,
    html,
  });
}
