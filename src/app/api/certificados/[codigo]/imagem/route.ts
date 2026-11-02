import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  obterCargaHorariaEmHoras,
  validarCertificado,
} from "@/lib/certificados/consultas";
import {
  caixaQr,
  gerarQrDoCertificado,
  urlValidacaoCertificado,
} from "@/lib/certificados/qr";
import { fraseParticipacao } from "@/lib/evento-utils";

const MODELO_CERTIFICADO = path.join(
  process.cwd(),
  "assets",
  "certificado_partiu-dpm.png",
);
const FONTE_LORA = path.join(
  process.cwd(),
  "assets",
  "fontes",
  "Lora-Variable.ttf",
);
const FONTE_ALEX_BRUSH = path.join(
  process.cwd(),
  "assets",
  "fontes",
  "AlexBrush-Regular.ttf",
);

/** Fontes embutidas no SVG: o certificado é exibido dentro de um <img> e o
 * navegador não pode buscar arquivos externos nesse contexto. */
function criarFontesCss(lora: Buffer, alexBrush: Buffer) {
  return `
@font-face {
  font-family: 'Lora';
  font-style: normal;
  font-weight: 400 700;
  src: url(data:font/ttf;base64,${lora.toString("base64")}) format('truetype');
}
@font-face {
  font-family: 'Alex Brush';
  font-style: normal;
  font-weight: 400;
  src: url(data:font/ttf;base64,${alexBrush.toString("base64")}) format('truetype');
}`;
}

/** Mantém a assinatura dentro da linha, reduzindo a fonte ou comprimindo o
 * espaçamento quando o nome é muito comprido. */
function ajustarAssinatura(texto: string) {
  const larguraMaxima = 460;
  const tamanho = Math.max(
    26,
    Math.min(
      58,
      Math.floor(larguraMaxima / (0.4 * Math.max(texto.length, 1))),
    ),
  );
  const larguraEstimada = texto.length * 0.4 * tamanho;

  return {
    tamanho,
    textLength:
      larguraEstimada > larguraMaxima
        ? ` textLength="${larguraMaxima}" lengthAdjust="spacingAndGlyphs"`
        : "",
  };
}

function limitar(texto: string, maximo: number) {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1).trimEnd()}…` : texto;
}

function tamanhoDaFonte(texto: string, tamanhoPadrao: number, minimo: number) {
  return Math.max(minimo, tamanhoPadrao - Math.max(0, texto.length - 26) * 1.4);
}

function formatarDataCertificado(data: string | null) {
  if (!data) return "Data não informada";

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(valor);
}

function partesDaData(data: string | null) {
  if (!data) return { dia: "—", mes: "—", ano: "—" };

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return { dia: "—", mes: "—", ano: "—" };

  const partes = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(valor);

  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((item) => item.type === tipo)?.value ?? "—";

  return {
    dia: parte("day"),
    mes: parte("month"),
    // O formulário traz "de 20" já impresso; só completamos os dois últimos dígitos.
    ano: parte("year").slice(-2),
  };
}

function textoDoCertificado(dados: {
  participante: string;
  evento: string;
  tipo: string;
  coordenadorNome: string | null;
  eventoInicio: string | null;
  eventoFim: string | null;
  dataEmissao: string | null;
}) {
  const participante = limitar(dados.participante.trim() || "Participante", 80);
  const evento = limitar(dados.evento.trim() || "Evento", 115);
  const frase = fraseParticipacao(dados.tipo);
  const coordenador = dados.coordenadorNome?.trim()
    ? limitar(dados.coordenadorNome.trim(), 80)
    : null;
  const cargaHoraria =
    obterCargaHorariaEmHoras(dados.eventoInicio, dados.eventoFim) ?? "—";

  return {
    participante,
    evento,
    frase,
    coordenador,
    cargaHoraria,
    dataEvento: formatarDataCertificado(dados.eventoInicio),
    emissao: partesDaData(dados.dataEmissao),
  };
}

function escaparXml(texto: string) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Mantém o modelo como PNG e entrega a sobreposição como SVG. Diferente de um
 * rasterizador de servidor, o navegador do participante tem uma fonte Unicode
 * disponível para nomes e datas em português, sem produzir quadrados.
 */
function criarCertificadoSvg(
  modelo: Buffer,
  fontesCss: string,
  dados: ReturnType<typeof textoDoCertificado>,
  qr: { conteudo: string; escala: number } | null,
) {
  const participante = escaparXml(dados.participante);
  const evento = escaparXml(dados.evento);
  const frase = escaparXml(dados.frase);
  const coordenador = dados.coordenador ? escaparXml(dados.coordenador) : null;
  const ajusteAssinatura = dados.coordenador
    ? ajustarAssinatura(dados.coordenador)
    : null;
  const dataEvento = escaparXml(dados.dataEvento);
  const cargaHoraria = escaparXml(dados.cargaHoraria);
  const diaEmissao = escaparXml(dados.emissao.dia);
  const mesEmissao = escaparXml(dados.emissao.mes);
  const anoEmissao = escaparXml(dados.emissao.ano);

  const blocoAssinatura =
    coordenador && ajusteAssinatura
      ? `<text x="1220" y="1124" text-anchor="middle" font-family="'Alex Brush', cursive" font-size="${ajusteAssinatura.tamanho}"${ajusteAssinatura.textLength}>${coordenador}</text>`
      : "<!-- Coordenação sem assinatura -->";

  const blocoQr = qr
    ? `<g transform="translate(${caixaQr.x},${caixaQr.y}) scale(${qr.escala.toFixed(4)})" shape-rendering="crispEdges">${qr.conteudo}</g>`
    : "<!-- QR indisponível -->";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1414" viewBox="0 0 2000 1414">
  <defs>
    <style type="text/css"><![CDATA[${fontesCss}]]></style>
  </defs>
  <image href="data:image/png;base64,${modelo.toString("base64")}" width="2000" height="1414"/>
  <g fill="#062d47" font-family="Lora, Georgia, 'Times New Roman', serif" text-anchor="middle">
    <text x="1000" y="650" dominant-baseline="middle" font-size="${tamanhoDaFonte(dados.participante, 54, 34)}" font-weight="700">${participante}</text>
    <!-- "participou do/da <tipo>" usa a mesma serifa do modelo; o título fica na linha de baixo. -->
    <text x="1000" y="724" dominant-baseline="middle" font-size="${tamanhoDaFonte(dados.frase, 38, 28)}">${frase}</text>
    <text x="1000" y="798" dominant-baseline="middle" font-size="${tamanhoDaFonte(dados.evento, 44, 26)}" font-weight="700">${evento}</text>
    <!-- Campos alinhados aos espaços em branco do formulário original. -->
    <text x="805" y="882" dominant-baseline="middle" font-size="38">${dataEvento}</text>
    <text x="1490" y="882" dominant-baseline="middle" font-size="38">${cargaHoraria}</text>
    <!-- Completa: Itapetininga, [dia] de [mês] de 20[ano]. -->
    <text x="882" y="976" dominant-baseline="middle" font-size="38">${diaEmissao}</text>
    <text x="1079" y="976" dominant-baseline="middle" font-size="38">${mesEmissao}</text>
    <text x="1282" y="976" dominant-baseline="middle" font-size="38">${anoEmissao}</text>
    ${blocoAssinatura}
  </g>
  <!-- QR de validação na caixa reservada pelo modelo. -->
  ${blocoQr}
</svg>`;
}

/** Certificado público para emitidos. Certificados cancelados ou inválidos
 * recebem 404 porque a consulta usa a mesma RPC de validação pública. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params;
  const certificado = await validarCertificado(codigo);

  if (!certificado) {
    return new Response("Certificado não encontrado.", { status: 404 });
  }

  try {
    const [modelo, lora, alexBrush] = await Promise.all([
      readFile(MODELO_CERTIFICADO),
      readFile(FONTE_LORA),
      readFile(FONTE_ALEX_BRUSH),
    ]);
    if (modelo.length === 0) throw new Error("Modelo de certificado vazio.");
    if (lora.length === 0 || alexBrush.length === 0) {
      throw new Error("Fonte do certificado vazia.");
    }

    const qr = await gerarQrDoCertificado(urlValidacaoCertificado(request, certificado.codigo));
    const fontesCss = criarFontesCss(lora, alexBrush);

    return new Response(
      criarCertificadoSvg(modelo, fontesCss, textoDoCertificado(certificado), qr),
      {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Content-Disposition": `inline; filename="certificado-${codigo}.svg"`,
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (erro) {
    console.error("[partiu-dpm] Falha ao gerar a imagem do certificado.", erro);
    return new Response("Não foi possível gerar o certificado.", { status: 500 });
  }
}
