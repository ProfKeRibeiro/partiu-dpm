import { readFile } from "node:fs/promises";
import path from "node:path";

export const LARGURA_CARD = 1080;
export const ALTURA_CARD = 1920;
/** Zona segura do story: nada crítico acima de 250px nem abaixo de 340px. */
const MARGEM_SEGURA_TOP = 250;
const MARGEM_SEGURA_BOTTOM = 340;

const COR_FUNDO = "#780000";
const COR_ACENTO = "#C1121F";
const COR_CREAM = "#FDF0D5";
const COR_AZUL = "#003049";

const TAMANHO_AVATAR = 540;

const FONTE_LORA_REGULAR = path.join(
  process.cwd(),
  "assets",
  "fontes",
  "Lora-Regular.ttf",
);
const FONTE_LORA_BOLD = path.join(
  process.cwd(),
  "assets",
  "fontes",
  "Lora-Bold.ttf",
);

export async function carregarFontesCard() {
  const [regular, bold] = await Promise.all([
    readFile(FONTE_LORA_REGULAR),
    readFile(FONTE_LORA_BOLD),
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

function limitar(texto: string | null | undefined, maximo: number) {
  const limpo = (texto ?? "").trim();
  if (limpo.length > maximo) {
    return `${limpo.slice(0, Math.max(1, maximo - 1)).trimEnd()}…`;
  }
  return limpo;
}

export function criarElementoCard(dados: {
  titulo: string;
  nome: string;
  avatarDataUri: string | null;
}) {
  const titulo = limitar(dados.titulo, 42) || "Evento";
  const nome = limitar(dados.nome, 42) || "Participante";

  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");

  return (
    <div
      style={{
        width: LARGURA_CARD,
        height: ALTURA_CARD,
        backgroundColor: COR_FUNDO,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: MARGEM_SEGURA_TOP,
        paddingBottom: MARGEM_SEGURA_BOTTOM,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: LARGURA_CARD - 120,
          height: ALTURA_CARD - MARGEM_SEGURA_TOP - MARGEM_SEGURA_BOTTOM,
          border: `6px solid ${COR_CREAM}`,
          borderRadius: 36,
          paddingTop: 44,
          paddingBottom: 44,
          paddingLeft: 24,
          paddingRight: 24,
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              color: COR_CREAM,
              fontFamily: "Lora",
              letterSpacing: 10,
              marginBottom: 22,
            }}
          >
            CONFIRMADO
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 700,
              color: COR_CREAM,
              fontFamily: "Lora",
              textAlign: "center",
              marginBottom: 40,
              paddingLeft: 24,
              paddingRight: 24,
            }}
          >
            {titulo.toUpperCase()}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
        <div
          style={{
            display: "flex",
            marginTop: 16,
            marginBottom: 28,
            padding: 18,
            backgroundColor: COR_CREAM,
            borderRadius: 24,
          }}
        >
          <div
            style={{
              width: TAMANHO_AVATAR,
              height: TAMANHO_AVATAR,
              borderRadius: 16,
              backgroundColor: COR_AZUL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {dados.avatarDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dados.avatarDataUri}
                width={TAMANHO_AVATAR}
                height={TAMANHO_AVATAR}
                alt={`Foto de perfil do participante ${dados.nome}`}
                style={{ borderRadius: 16 }}
              />
            ) : (
              <span
                style={{
                  display: "flex",
                  fontSize: 200,
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
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 150,
            fontWeight: 700,
            color: COR_CREAM,
            fontFamily: "Lora",
            textAlign: "center",
            marginTop: 8,
            marginBottom: 24,
          }}
        >
          EU VOU!
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            color: COR_CREAM,
            fontFamily: "Lora",
            textAlign: "center",
            marginTop: 4,
            marginBottom: 40,
            paddingLeft: 60,
            paddingRight: 60,
          }}
        >
          {nome}
        </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 4,
            backgroundColor: COR_ACENTO,
            borderRadius: 9999,
            paddingTop: 18,
            paddingBottom: 18,
            paddingLeft: 44,
            paddingRight: 44,
          }}
        >
          <span
            style={{
              display: "flex",
              fontSize: 38,
              fontWeight: 700,
              color: COR_CREAM,
              fontFamily: "Lora",
              textAlign: "center",
            }}
          >
            Partiu DPM / Etec DPM
          </span>
        </div>
      </div>
    </div>
  );
}
