import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  obterCargaHorariaEmHoras,
  validarCertificado,
} from "@/lib/certificados/consultas";

const MODELO_CERTIFICADO = path.join(
  process.cwd(),
  "assets",
  "certificado_partiu-dpm.png",
);

function escaparSvg(texto: string) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(valor);
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
    dataEmissao: formatarDataCertificado(dados.dataEmissao),
  };
}

function criarSobreposicaoSvg(dados: ReturnType<typeof textoDoCertificado>) {
  const participante = escaparSvg(dados.participante);
  const evento = escaparSvg(dados.evento);
  const dataEvento = escaparSvg(dados.dataEvento);
  const cargaHoraria = escaparSvg(dados.cargaHoraria);
  const dataEmissao = escaparSvg(`Itapetininga, ${dados.dataEmissao}`);

  return Buffer.from(`
    <svg width="2000" height="1414" viewBox="0 0 2000 1414" xmlns="http://www.w3.org/2000/svg">
      <style>
        .serif { font-family: Georgia, 'Times New Roman', serif; fill: #062d47; }
      </style>
      <text x="1000" y="667" text-anchor="middle" class="serif" font-size="${tamanhoDaFonte(dados.participante, 54, 34)}" font-weight="700">${participante}</text>
      <text x="1000" y="798" text-anchor="middle" class="serif" font-size="${tamanhoDaFonte(dados.evento, 44, 26)}" font-weight="700">${evento}</text>
      <text x="710" y="914" text-anchor="middle" class="serif" font-size="34">${dataEvento}</text>
      <text x="1450" y="914" text-anchor="middle" class="serif" font-size="38" font-weight="700">${cargaHoraria}</text>
      <rect x="585" y="965" width="810" height="66" rx="4" fill="#f9f7ef" fill-opacity="0.94"/>
      <text x="990" y="1010" text-anchor="middle" class="serif" font-size="29">${dataEmissao}</text>
    </svg>
  `);
}

/** PNG público para certificados emitidos. Certificados cancelados ou inválidos
 * recebem 404 porque a consulta usa a mesma RPC de validação pública. */
export async function GET(
  _request: Request,
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

    const imagem = await sharp(modelo)
      .composite([
        {
          input: criarSobreposicaoSvg(textoDoCertificado(certificado)),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    return new Response(imagem, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="certificado-${codigo}.png"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (erro) {
    console.error("[partiu-dpm] Falha ao gerar a imagem do certificado.", erro);
    return new Response("Não foi possível gerar o certificado.", { status: 500 });
  }
}
