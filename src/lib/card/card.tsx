import { readFile } from "node:fs/promises";
import path from "node:path";

export const LARGURA_CARD = 1080;
export const ALTURA_CARD = 1920;

const COR_FUNDO = "#6A0000";
const COR_CREAM = "#FFF0CE";
const COR_AZUL = "#0C356A";

/**
 * Moldura do story (PNG transparente com as etiquetas, coração, ingresso e
 * pontinhos). A janela da foto é o retângulo transparente dentro da moldura.
 */
const MOLDURA_ORIGINAL = { largura: 954, altura: 1240 };
const MOLDURA_LARGURA = 900;
const MOLDURA_ESCALA = MOLDURA_LARGURA / MOLDURA_ORIGINAL.largura;
const MOLDURA = {
  left: 48,
  top: 334,
  width: MOLDURA_LARGURA,
  height: MOLDURA_ORIGINAL.altura * MOLDURA_ESCALA,
};

/** Janela transparente dentro da moldura, em coordenadas do PNG original. */
const JANELA_ORIGINAL = { x: 191, y: 238, largura: 662, altura: 825 };

export const FOTO_CARD = {
  x: MOLDURA.left + JANELA_ORIGINAL.x * MOLDURA_ESCALA,
  y: MOLDURA.top + JANELA_ORIGINAL.y * MOLDURA_ESCALA,
  largura: JANELA_ORIGINAL.largura * MOLDURA_ESCALA,
  altura: JANELA_ORIGINAL.altura * MOLDURA_ESCALA,
};

const LOGO = { largura: 520, top: 1300 };
/** Corpo das letras do "EU VOU!" em arco. */
const FONTE_ARCO = 165;

const DIR_ASSETS = path.join(process.cwd(), "assets");

export type CamadasCard = {
  moldura: string;
  logo: string;
};

/** Lê a moldura e o selo do projeto e devolve data URIs. */
export async function carregarCamadasCard(): Promise<CamadasCard> {
  const [moldura, logo] = await Promise.all([
    readFile(path.join(DIR_ASSETS, "card", "moldura.png")),
    readFile(path.join(DIR_ASSETS, "logo-oficial-original.png")),
  ]);

  return {
    moldura: `data:image/png;base64,${moldura.toString("base64")}`,
    logo: `data:image/png;base64,${logo.toString("base64")}`,
  };
}

const ROTULOS_TIPO: Record<string, string> = {
  treinamento: "TREINAMENTO",
  maratona: "MARATONA",
  competicao: "COMPETIÇÃO",
  competição: "COMPETIÇÃO",
  palestra: "PALESTRA",
  workshop: "WORKSHOP",
  oficina: "OFICINA",
  feira: "FEIRA",
  outro: "EVENTO",
};

export function rotuloTipoEvento(tipo: string | null | undefined) {
  const chave = (tipo ?? "").trim().toLowerCase();
  return ROTULOS_TIPO[chave] ?? (chave ? chave.toUpperCase() : "EVENTO");
}

/** Largura média de um caractere da Lora Bold, em em. */
const FATOR_LARGURA = 0.736;
const LARGURA_MAX_TITULO = 900;
/** Altura disponível entre o rótulo do tipo e a moldura. */
const ALTURA_MAX_TITULO = 330;
const ENTRELINHA = 0.8;

/**
 * Hierarquia de tamanhos da referência: a primeira linha é a menor e a última
 * a maior (ex.: MONGODB pequeno, DAY bem maior).
 */
const FATORES_LINHA: Record<number, number[]> = {
  1: [1],
  2: [0.58, 1],
  3: [0.38, 0.64, 1],
};

function dividirLinhas(titulo: string) {
  const palavras = titulo.split(/\s+/).filter(Boolean);

  if (palavras.length <= 3) return palavras;

  /* Nomes longos: duas linhas equilibradas por número de caracteres. */
  const total = palavras.reduce((soma, palavra) => soma + palavra.length, 0);
  const linhas: string[] = [];
  let atual = "";
  let acumulado = 0;

  for (const palavra of palavras) {
    const proxima = acumulado + palavra.length;

    if (atual && proxima > total / 2) {
      linhas.push(atual);
      atual = palavra;
      acumulado = palavra.length;
    } else {
      atual = atual ? `${atual} ${palavra}` : palavra;
      acumulado = proxima;
    }
  }

  if (atual) linhas.push(atual);
  return linhas;
}

/** Calcula corpo de cada linha respeitando largura e altura disponíveis. */
export function dimensionarTitulo(titulo: string) {
  const linhas = dividirLinhas(titulo);
  const fatores = FATORES_LINHA[linhas.length] ?? FATORES_LINHA[3];
  const somaFatores = fatores.reduce((soma, fator) => soma + fator, 0);

  let base = ALTURA_MAX_TITULO / (somaFatores * ENTRELINHA);

  linhas.forEach((linha, indice) => {
    const limite = LARGURA_MAX_TITULO / (linha.length * FATOR_LARGURA * fatores[indice]);
    base = Math.min(base, limite);
  });

  base = Math.min(base, 250);

  return linhas.map((linha, indice) => ({
    texto: linha,
    tamanho: Math.round(base * fatores[indice]),
  }));
}

function contorno(espessura: number) {
  return [
    `-${espessura}px 0 0 ${COR_AZUL}`,
    `${espessura}px 0 0 ${COR_AZUL}`,
    `0 -${espessura}px 0 ${COR_AZUL}`,
    `0 ${espessura}px 0 ${COR_AZUL}`,
    `-${espessura}px -${espessura}px 0 ${COR_AZUL}`,
    `${espessura}px -${espessura}px 0 ${COR_AZUL}`,
    `-${espessura}px ${espessura}px 0 ${COR_AZUL}`,
    `${espessura}px ${espessura}px 0 ${COR_AZUL}`,
  ].join(", ");
}

type LetraArco = {
  caractere: string;
  esquerda: number;
  topo: number;
  largura: number;
  rotacao: number;
};

/**
 * Distribui as letras de "EU VOU!" em arco, como na referência: o centro fica
 * mais alto e as pontas descem, cada letra girada na tangente do arco.
 */
function letrasNoArco(
  texto: string,
  fonte: number,
  raio: number,
  centroX: number,
  centroY: number,
): LetraArco[] {
  const caracteres = [...texto];
  const pesos = caracteres.map((c) => (c === " " ? 0.3 : 0.67));
  const total = pesos.reduce((soma, peso) => soma + peso, 0) * fonte;
  const abertura = total / raio;

  let cursor = -abertura / 2;

  return caracteres.map((caractere, indice) => {
    const passo = (pesos[indice] * fonte) / raio;
    const angulo = cursor + passo / 2;
    cursor += passo;

    return {
      caractere,
      esquerda: centroX + raio * Math.sin(angulo) - (pesos[indice] * fonte) / 2,
      topo: centroY + raio * (1 - Math.cos(angulo)) - fonte * 0.5,
      largura: pesos[indice] * fonte,
      rotacao: (angulo * 180) / Math.PI,
    };
  });
}

/**
 * Card de confirmação do story: fundo vinho, moldura e selo oficiais do
 * projeto e textos em Lora. Só a foto e o nome do evento mudam.
 */
export function criarElementoCard(dados: {
  tipoEvento: string | null;
  titulo: string;
  nome: string;
  avatarDataUri: string | null;
  camadas: CamadasCard;
}) {
  const titulo = (dados.titulo ?? "").trim().toUpperCase() || "EVENTO";
  const nome = (dados.nome ?? "").trim() || "Participante";

  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");

  const linhas = dimensionarTitulo(titulo);

  const euVou = letrasNoArco("EU VOU!", FONTE_ARCO, 650, 540, 1215);

  return (
    <div
      style={{
        width: LARGURA_CARD,
        height: ALTURA_CARD,
        display: "flex",
        position: "relative",
        backgroundColor: COR_FUNDO,
      }}
    >
      {/* Foto do participante dentro da janela transparente da moldura. */}
      <div
        style={{
          position: "absolute",
          top: FOTO_CARD.y,
          left: FOTO_CARD.x,
          width: FOTO_CARD.largura,
          height: FOTO_CARD.altura,
          display: "flex",
          overflow: "hidden",
          backgroundColor: COR_AZUL,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {dados.avatarDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dados.avatarDataUri}
            width={FOTO_CARD.largura}
            height={FOTO_CARD.altura}
            alt={`Foto de perfil do participante ${dados.nome}`}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        ) : (
          <span
            style={{
              display: "flex",
              fontSize: 240,
              fontWeight: 700,
              color: COR_CREAM,
              fontFamily: "Lora",
              textAlign: "center",
            }}
          >
            {iniciais}
          </span>
        )}
      </div>

      {/* Moldura, etiquetas e pontinhos. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dados.camadas.moldura}
        width={MOLDURA.width}
        height={MOLDURA.height}
        alt=""
        style={{ position: "absolute", top: MOLDURA.top, left: MOLDURA.left }}
      />

      {/* Selo oficial Partiu DPM. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dados.camadas.logo}
        width={LOGO.largura}
        height={LOGO.largura}
        alt="Partiu DPM — Etec Darcy Pereira de Moraes"
        style={{
          position: "absolute",
          top: LOGO.top,
          left: (LARGURA_CARD - LOGO.largura) / 2,
        }}
      />

      {/* Rótulo do tipo e nome do evento, com a hierarquia da referência. */}
      <div
        style={{
          position: "absolute",
          top: 132,
          left: 0,
          width: LARGURA_CARD,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Rótulo alinhado à direita, com o traço embaixo, como na referência. */}
        <div
          style={{
            width: LARGURA_CARD,
            paddingRight: 150,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 700,
              color: COR_CREAM,
              fontFamily: "Lora",
              letterSpacing: 2,
              lineHeight: 1.05,
              borderBottom: `5px solid ${COR_CREAM}`,
              paddingBottom: 6,
              textShadow: `${contorno(2)}, 5px 6px 0 ${COR_AZUL}`,
            }}
          >
            {rotuloTipoEvento(dados.tipoEvento)}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: LARGURA_CARD,
            marginTop: 6,
          }}
        >
          {linhas.map((linha) => (
            <div
              key={linha.texto}
              style={{
                display: "flex",
                fontSize: linha.tamanho,
                fontWeight: 700,
                color: COR_CREAM,
                fontFamily: "Lora",
                lineHeight: ENTRELINHA,
                letterSpacing: 2,
                textShadow: `${contorno(5)}, 16px 20px 0 ${COR_AZUL}`,
              }}
            >
              {linha.texto}
            </div>
          ))}
        </div>
      </div>

      {/* "EU VOU!" arqueado sobre a base da foto. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: LARGURA_CARD,
          height: ALTURA_CARD,
          display: "flex",
        }}
      >
        {euVou.map((letra, indice) => (
          <div
            key={`${letra.caractere}-${indice}`}
            style={{
              position: "absolute",
              left: letra.esquerda,
              top: letra.topo,
              width: letra.largura,
              display: "flex",
              justifyContent: "center",
              transform: `rotate(${letra.rotacao}deg)`,
              fontSize: FONTE_ARCO,
              fontWeight: 700,
              color: COR_CREAM,
              fontFamily: "Lora",
              lineHeight: 1,
              textShadow: `${contorno(6)}, 8px 10px 0 ${COR_AZUL}`,
            }}
          >
            {letra.caractere}
          </div>
        ))}
      </div>
    </div>
  );
}

export async function carregarFontesCard() {
  const [regular, bold] = await Promise.all([
    readFile(path.join(process.cwd(), "assets", "fontes", "Lora-Regular.ttf")),
    readFile(path.join(process.cwd(), "assets", "fontes", "Lora-Bold.ttf")),
  ]);

  return [
    {
      name: "Lora",
      data: regular,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Lora",
      data: bold,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];
}
