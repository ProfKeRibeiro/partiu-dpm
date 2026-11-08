import { readFile } from "node:fs/promises";
import path from "node:path";

export const LARGURA_CARD = 1080;
export const ALTURA_CARD = 1920;

const COR_CREAM = "#FFF0CE";
const COR_AZUL = "#0C356A";

/** Área da foto no template (coordenadas do PNG 1080x1920). */
export const FOTO_CARD = { x: 233, y: 545, largura: 684, altura: 855 };

const DIR_ASSETS = path.join(process.cwd(), "assets", "card");

export type CamadasCard = {
  base: string;
  overlay: string;
};

/** Lê as camadas do template e devolve data URIs. */
export async function carregarCamadasCard(): Promise<CamadasCard> {
  const [base, overlay] = await Promise.all([
    readFile(path.join(DIR_ASSETS, "story-base.png")),
    readFile(path.join(DIR_ASSETS, "story-overlay.png")),
  ]);

  return {
    base: `data:image/png;base64,${base.toString("base64")}`,
    overlay: `data:image/png;base64,${overlay.toString("base64")}`,
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
 * duas linhas dentro da área do título (mesmo peso visual da referência).
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

/**
 * Card de confirmação no mesmo esquema do story de referência: o template
 * (frames, adesivos, "EU VOU!" e selo) é fixo e só a foto e o nome do evento
 * mudam.
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

  const contorno = [
    `-3px 0 0 ${COR_AZUL}`,
    `3px 0 0 ${COR_AZUL}`,
    `0 -3px 0 ${COR_AZUL}`,
    `0 3px 0 ${COR_AZUL}`,
    `-2px -2px 0 ${COR_AZUL}`,
    `2px -2px 0 ${COR_AZUL}`,
    `-2px 2px 0 ${COR_AZUL}`,
    `2px 2px 0 ${COR_AZUL}`,
  ].join(", ");

  const contornoTitulo = [
    `-6px 0 0 ${COR_AZUL}`,
    `6px 0 0 ${COR_AZUL}`,
    `0 -6px 0 ${COR_AZUL}`,
    `0 6px 0 ${COR_AZUL}`,
    `-4px -4px 0 ${COR_AZUL}`,
    `4px -4px 0 ${COR_AZUL}`,
    `-4px 4px 0 ${COR_AZUL}`,
    `4px 4px 0 ${COR_AZUL}`,
    `12px 14px 0 ${COR_AZUL}`,
  ].join(", ");

  return (
    <div
      style={{
        width: LARGURA_CARD,
        height: ALTURA_CARD,
        display: "flex",
        position: "relative",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dados.camadas.base}
        width={LARGURA_CARD}
        height={ALTURA_CARD}
        alt=""
        style={{ position: "absolute", top: 0, left: 0 }}
      />

      {/* Foto do participante dentro do quadro do template. */}
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
              fontSize: 260,
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

      {/* Frames, "EU VOU!", selo e adesivos do template. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dados.camadas.overlay}
        width={LARGURA_CARD}
        height={ALTURA_CARD}
        alt=""
        style={{ position: "absolute", top: 0, left: 0 }}
      />

      {/* Rótulo do tipo e nome do evento no lugar do título original. */}
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
            textShadow: contorno,
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
                textShadow: contornoTitulo,
              }}
            >
              {linha}
            </div>
          ))}
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
