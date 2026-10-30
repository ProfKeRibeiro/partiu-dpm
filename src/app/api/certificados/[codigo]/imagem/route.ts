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

const MODELO_CERTIFICADO = path.join(
  process.cwd(),
  "assets",
  "certificado_partiu-dpm.png",
);

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
    month: "long",
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
  eventoInicio: string | null;
  eventoFim: string | null;
  dataEmissao: string | null;
}) {
  const participante = limitar(dados.participante.trim() || "Participante", 80);
  const evento = limitar(dados.evento.trim() || "Evento", 115);
  const cargaHoraria =
    obterCargaHorariaEmHoras(dados.eventoInicio, dados.eventoFim) ?? "—";

  return {
    participante,
    evento,
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
  dados: ReturnType<typeof textoDoCertificado>,
  qr: { conteudo: string; escala: number } | null,
) {
  const participante = escaparXml(dados.participante);
  const evento = escaparXml(dados.evento);
  const dataEvento = escaparXml(dados.dataEvento);
  const cargaHoraria = escaparXml(dados.cargaHoraria);
  const diaEmissao = escaparXml(dados.emissao.dia);
  const mesEmissao = escaparXml(dados.emissao.mes);
  const anoEmissao = escaparXml(dados.emissao.ano);

  const blocoQr = qr
    ? `<g transform="translate(${caixaQr.x},${caixaQr.y}) scale(${qr.escala.toFixed(4)})" shape-rendering="crispEdges">${qr.conteudo}</g>`
    : "<!-- QR indisponível -->";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1414" viewBox="0 0 2000 1414">
  <image href="data:image/png;base64,${modelo.toString("base64")}" width="2000" height="1414"/>
  <g fill="#062d47" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
    <text x="1000" y="650" dominant-baseline="middle" font-size="${tamanhoDaFonte(dados.participante, 54, 34)}" font-weight="700">${participante}</text>
    <text x="1000" y="798" dominant-baseline="middle" font-size="${tamanhoDaFonte(dados.evento, 44, 26)}" font-weight="700">${evento}</text>
    <!-- Campos alinhados aos espaços em branco do formulário original. -->
    <text x="805" y="882" dominant-baseline="middle" font-size="29">${dataEvento}</text>
    <text x="1490" y="882" dominant-baseline="middle" font-size="34" font-weight="700">${cargaHoraria}</text>
    <!-- Completa: Itapetininga, [dia] de [mês] de 20[ano]. -->
    <text x="842" y="1003" dominant-baseline="middle" font-size="28">${diaEmissao}</text>
    <text x="1057" y="1003" dominant-baseline="middle" font-size="28">${mesEmissao}</text>
    <text x="1245" y="1003" dominant-baseline="middle" font-size="28">${anoEmissao}</text>
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
    const modelo = await readFile(MODELO_CERTIFICADO);
    if (modelo.length === 0) throw new Error("Modelo de certificado vazio.");

    const qr = await gerarQrDoCertificado(urlValidacaoCertificado(request, certificado.codigo));

    return new Response(criarCertificadoSvg(modelo, textoDoCertificado(certificado), qr), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `inline; filename="certificado-${codigo}.svg"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (erro) {
    console.error("[partiu-dpm] Falha ao gerar a imagem do certificado.", erro);
    return new Response("Não foi possível gerar o certificado.", { status: 500 });
  }
}
