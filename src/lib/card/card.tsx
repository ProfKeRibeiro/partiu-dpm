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

const LARGURA_UTIL_TITULO = 920;
/** Aproximação da largura média de um caractere da Lora Bold. */
const FATOR_LARGURA = 0.74;

function quebrarTitulo(titulo: string, tamanho: number) {
  const palavras = titulo.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";

  for (const palavra of palavras) {
    const teste = atual ? `${atual} ${palavra}` : palavra;

    if (
      atual &&
      teste.length * FATOR_LARGURA * tamanho > LARGURA_UTIL_TITULO
    ) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }

  if (atual) linhas.push(atual);
  return linhas;
}

/**
 * Escolhe o maior corpo de fonte que mantém o nome do evento em no máximo
 * duas linhas dentro da área do título.
 */
function dimensionarTitulo(titulo: string) {
  for (let tamanho = 196; tamanho >= 84; tamanho -= 4) {
    const linhas = quebrarTitulo(titulo, tamanho);

    if (
      linhas.length <= 2 &&
      linhas.every(
        (linha) => linha.length * FATOR_LARGURA * tamanho <= LARGURA_UTIL_TITULO,
      )
    ) {
      return { tamanho, linhas };
    }
  }

  return { tamanho: 84, linhas: quebrarTitulo(titulo, 84) };
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

  const { tamanho, linhas } = dimensionarTitulo(titulo);

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
        style={{
          position: "absolute",
          top: MOLDURA.top,
          left: MOLDURA.left,
        }}
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

      {/* Rótulo do tipo e nome do evento. */}
      <div
        style={{
          position: "absolute",
          top: 118,
          left: 0,
          width: LARGURA_CARD,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 58,
            fontWeight: 700,
            color: COR_CREAM,
            fontFamily: "Lora",
            letterSpacing: 4,
            textShadow: contorno(3),
            marginBottom: 10,
          }}
        >
          {rotuloTipoEvento(dados.tipoEvento)}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: LARGURA_CARD,
          }}
        >
          {linhas.map((linha) => (
            <div
              key={linha}
              style={{
                display: "flex",
                fontSize: tamanho,
                fontWeight: 700,
                color: COR_CREAM,
                fontFamily: "Lora",
                lineHeight: 0.96,
                letterSpacing: 2,
                textShadow: `${contorno(6)}, 12px 14px 0 ${COR_AZUL}`,
              }}
            >
              {linha}
            </div>
          ))}
        </div>
      </div>

      {/* "EU VOU!" em Lora sobre a base da foto, como na referência. */}
      <div
        style={{
          position: "absolute",
          top: 1104,
          left: 0,
          width: LARGURA_CARD,
          display: "flex",
          justifyContent: "center",
          transform: "rotate(-4deg)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 140,
            fontWeight: 700,
            color: COR_CREAM,
            fontFamily: "Lora",
            letterSpacing: 2,
            textShadow: `${contorno(7)}, 10px 12px 0 ${COR_AZUL}`,
          }}
        >
          EU VOU!
        </div>
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
