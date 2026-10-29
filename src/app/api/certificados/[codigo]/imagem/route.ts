import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { createElement } from "react";
import {
  obterCargaHorariaEmHoras,
  validarCertificado,
} from "@/lib/certificados/consultas";

const MODELO_CERTIFICADO = path.join(
  process.cwd(),
  "assets",
  "certificado_partiu-dpm.png",
);

// A fonte é distribuída junto com o próprio Next e é passada explicitamente
// ao gerador de imagem. Assim o certificado não depende das fontes instaladas
// na máquina/servidor que o estiver gerando.
const FONTE_CERTIFICADO = require.resolve(
  "next/dist/compiled/@vercel/og/Geist-Regular.ttf",
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

function criarImagem(
  modelo: Buffer,
  dados: ReturnType<typeof textoDoCertificado>,
  fonte: Buffer,
) {
  const camada = {
    position: "absolute" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
    color: "#062d47",
    fontFamily: "Certificado",
  };

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          position: "relative",
          display: "flex",
          width: "2000px",
          height: "1414px",
        },
      },
      createElement("img", {
        src: `data:image/png;base64,${modelo.toString("base64")}`,
        width: 2000,
        height: 1414,
        style: { position: "absolute", inset: 0 },
      }),
      createElement(
        "div",
        { style: { ...camada, left: "300px", top: "610px", width: "1400px", height: "80px", fontSize: `${tamanhoDaFonte(dados.participante, 54, 34)}px`, fontWeight: 700 } },
        dados.participante,
      ),
      createElement(
        "div",
        { style: { ...camada, left: "280px", top: "743px", width: "1440px", height: "70px", fontSize: `${tamanhoDaFonte(dados.evento, 44, 26)}px`, fontWeight: 700 } },
        dados.evento,
      ),
      createElement(
        "div",
        { style: { ...camada, left: "400px", top: "865px", width: "620px", height: "70px", fontSize: "34px" } },
        dados.dataEvento,
      ),
      createElement(
        "div",
        { style: { ...camada, left: "1330px", top: "865px", width: "240px", height: "70px", fontSize: "38px", fontWeight: 700 } },
        dados.cargaHoraria,
      ),
      createElement(
        "div",
        { style: { ...camada, left: "585px", top: "965px", width: "810px", height: "66px", backgroundColor: "#f9f7ef", fontSize: "29px" } },
        `Itapetininga, ${dados.dataEmissao}`,
      ),
    ),
    {
      width: 2000,
      height: 1414,
      fonts: [{ name: "Certificado", data: fonte, weight: 400, style: "normal" }],
    },
  );
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
    const [modelo, fonte] = await Promise.all([
      readFile(MODELO_CERTIFICADO),
      readFile(FONTE_CERTIFICADO),
    ]);
    if (modelo.length === 0) throw new Error("Modelo de certificado vazio.");

    const resposta = criarImagem(modelo, textoDoCertificado(certificado), fonte);
    resposta.headers.set(
      "Content-Disposition",
      `inline; filename="certificado-${codigo}.png"`,
    );
    resposta.headers.set("Cache-Control", "private, no-store");
    return resposta;
  } catch (erro) {
    console.error("[partiu-dpm] Falha ao gerar a imagem do certificado.", erro);
    return new Response("Não foi possível gerar o certificado.", { status: 500 });
  }
}
