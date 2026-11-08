import { ImageResponse } from "next/og";
import {
  ALTURA_CARD,
  LARGURA_CARD,
  carregarFontesCard,
  criarElementoCard,
} from "@/lib/card/card";

export async function GET() {
  return new ImageResponse(
    criarElementoCard({
      titulo: "MongoDB Day",
      nome: "Maria Clara Silva",
      avatarDataUri: null,
    }),
    {
      width: LARGURA_CARD,
      height: ALTURA_CARD,
      fonts: await carregarFontesCard(),
    },
  );
}
