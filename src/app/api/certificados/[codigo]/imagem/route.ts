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

/** O modelo oficial tem 1754×1240 px (A4 paisagem a 150 dpi). O miolo é
 * desenhado pelo código, centralizado no eixo do certificado. As linhas de
 * assinatura e a moldura do QR continuam no PNG. */
const MODELO = { largura: 1754, altura: 1240 };

const LAYOUT = {
  centroX: 877,
  certificamosY: 524,
  nomeY: 583,
  fraseY: 644,
  tituloY: 711,
  realizadoY: 767,
  emissaoY: 860,
  superintendente: { centroX: 579, nomeY: 988, cargoY: 1026 },
  coordenador: { centroX: 1071, nomeY: 985, cargoY: 1026 },
};

const COR_TEXTO = "#082237";
const COR_ASSINATURA = "#141414";
const COR_CARGO = "#203748";
const TAMANHO_CORPO = 33;
const TAMANHO_NOME = 47;
const TAMANHO_TITULO = 39;
const TAMANHO_ASSINATURA = 51;
const TAMANHO_CARGO = 22;
const TAMANHO_EMISSAO = 25;

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

/** Reduz a fonte (e, no limite, comprime o espaçamento) para o texto caber na
 * largura disponível do modelo. */
function ajustarTexto(
  texto: string,
  tamanhoPadrao: number,
  tamanhoMinimo: number,
  larguraMaxima: number,
  fatorLargura: number,
) {
  const tamanho = Math.max(
    tamanhoMinimo,
    Math.min(
      tamanhoPadrao,
      Math.floor(larguraMaxima / (fatorLargura * Math.max(texto.length, 1))),
    ),
  );
  const larguraEstimada = texto.length * fatorLargura * tamanho;

  return {
    tamanho,
    textLength:
      larguraEstimada > larguraMaxima
        ? ` textLength="${larguraMaxima}" lengthAdjust="spacingAndGlyphs"`
        : "",
  };
}

/** Assinaturas em Alex Brush têm desenho mais largo que a média; a linha do
 * modelo tem 421 px, então limitamos a 400 px para não encostar nas bordas. */
function ajustarAssinatura(texto: string) {
  return ajustarTexto(texto, TAMANHO_ASSINATURA, 24, 400, 0.4);
}

function limitar(texto: string, maximo: number) {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1).trimEnd()}…` : texto;
}

/** Datas por extenso em português: "31 de outubro" ou
 * "02 de novembro de 2026". */
function dataPorExtenso(data: string | null, comAno: boolean) {
  if (!data) return "—";

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "—";

  const partes = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    ...(comAno ? { year: "numeric" } : {}),
    timeZone: "America/Sao_Paulo",
  }).formatToParts(valor);

  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((item) => item.type === tipo)?.value ?? "—";

  const dia = parte("day");
  const mes = parte("month");

  return comAno ? `${dia} de ${mes} de ${parte("year")}` : `${dia} de ${mes}`;
}

function textoDoCertificado(dados: {
  participante: string;
  evento: string;
  tipo: string;
  coordenadorNome: string | null;
  coordenadorCargo: string | null;
  superintendenteNome: string | null;
  superintendenteCargo: string | null;
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
  const superintendente = dados.superintendenteNome?.trim()
    ? limitar(dados.superintendenteNome.trim(), 80)
    : null;
  const cargaHoraria =
    obterCargaHorariaEmHoras(dados.eventoInicio, dados.eventoFim) ?? "—";
  const dataEvento = dataPorExtenso(dados.eventoInicio, false);

  return {
    participante,
    evento,
    frase,
    coordenador,
    coordenadorCargo: dados.coordenadorCargo?.trim()
      ? limitar(dados.coordenadorCargo.trim(), 80)
      : null,
    superintendente,
    superintendenteCargo: dados.superintendenteCargo?.trim()
      ? limitar(dados.superintendenteCargo.trim(), 80)
      : null,
    realizado: `realizado em ${dataEvento}, com carga horária de ${cargaHoraria} horas.`,
    emissao: `Itapetininga, ${dataPorExtenso(dados.dataEmissao, true)}`,
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

function assinaturaSvg(
  nome: string | null,
  cargo: string | null,
  posicao: { centroX: number; nomeY: number; cargoY: number },
) {
  if (!nome) {
    return `<!-- Assinatura sem nome: linha e cargo permanecem -->${
      cargo
        ? `\n    <text x="${posicao.centroX}" y="${posicao.cargoY}" text-anchor="middle" font-family="Lora, Georgia, 'Times New Roman', serif" font-size="${TAMANHO_CARGO}" letter-spacing="-1" fill="${COR_CARGO}">${escaparXml(cargo)}</text>`
        : ""
    }`;
  }

  const ajuste = ajustarAssinatura(nome);

  return `<text x="${posicao.centroX}" y="${posicao.nomeY}" text-anchor="middle" font-family="'Alex Brush', cursive" font-size="${ajuste.tamanho}"${ajuste.textLength} fill="${COR_ASSINATURA}">${escaparXml(nome)}</text>${
    cargo
      ? `\n    <text x="${posicao.centroX}" y="${posicao.cargoY}" text-anchor="middle" font-family="Lora, Georgia, 'Times New Roman', serif" font-size="${TAMANHO_CARGO}" letter-spacing="-1" fill="${COR_CARGO}">${escaparXml(cargo)}</text>`
      : ""
  }`;
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
  const realizado = escaparXml(dados.realizado);
  const emissao = escaparXml(dados.emissao);
  const certificamos = "Certificamos que";

  const nome = ajustarTexto(dados.participante, TAMANHO_NOME, 28, 1000, 0.53);
  const titulo = ajustarTexto(dados.evento, TAMANHO_TITULO, 24, 1000, 0.53);
  const fraseAjustada = ajustarTexto(dados.frase, TAMANHO_CORPO, 24, 1000, 0.5);
  const realizadoAjustado = ajustarTexto(
    dados.realizado,
    TAMANHO_CORPO,
    22,
    1060,
    0.5,
  );
  const emissaoAjustada = ajustarTexto(
    dados.emissao,
    TAMANHO_EMISSAO,
    18,
    1060,
    0.5,
  );

  const blocoQr = qr
    ? `<g transform="translate(${caixaQr.x},${caixaQr.y}) scale(${qr.escala.toFixed(4)})" shape-rendering="crispEdges">${qr.conteudo}</g>`
    : "<!-- QR indisponível -->";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${MODELO.largura}" height="${MODELO.altura}" viewBox="0 0 ${MODELO.largura} ${MODELO.altura}">
  <defs>
    <style type="text/css"><![CDATA[${fontesCss}]]></style>
  </defs>
  <image href="data:image/png;base64,${modelo.toString("base64")}" width="${MODELO.largura}" height="${MODELO.altura}"/>
  <!-- Todo o miolo é centralizado no eixo do certificado. -->
  <g fill="${COR_TEXTO}" font-family="Lora, Georgia, 'Times New Roman', serif" text-anchor="middle">
    <text x="${LAYOUT.centroX}" y="${LAYOUT.certificamosY}" font-size="${TAMANHO_CORPO}">${certificamos}</text>
    <text x="${LAYOUT.centroX}" y="${LAYOUT.nomeY}" font-size="${nome.tamanho}" font-weight="700"${nome.textLength}>${participante}</text>
    <text x="${LAYOUT.centroX}" y="${LAYOUT.fraseY}" font-size="${fraseAjustada.tamanho}"${fraseAjustada.textLength}>${frase}</text>
    <text x="${LAYOUT.centroX}" y="${LAYOUT.tituloY}" font-size="${titulo.tamanho}" font-weight="700"${titulo.textLength}>${evento}</text>
    <text x="${LAYOUT.centroX}" y="${LAYOUT.realizadoY}" font-size="${realizadoAjustado.tamanho}"${realizadoAjustado.textLength}>${realizado}</text>
    <text x="${LAYOUT.centroX}" y="${LAYOUT.emissaoY}" font-size="${emissaoAjustada.tamanho}"${emissaoAjustada.textLength}>${emissao}</text>
  </g>
  <g>
    <!-- Superintendência: assinatura e cargo configurados no evento. -->
    ${assinaturaSvg(dados.superintendente, dados.superintendenteCargo, LAYOUT.superintendente)}
    <!-- Coordenação: assinatura e cargo configurados no evento. -->
    ${assinaturaSvg(dados.coordenador, dados.coordenadorCargo, LAYOUT.coordenador)}
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

    const qr = await gerarQrDoCertificado(
      urlValidacaoCertificado(request, certificado.codigo),
    );
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
    return new Response("Não foi possível gerar o certificado.", {
      status: 500,
    });
  }
}
