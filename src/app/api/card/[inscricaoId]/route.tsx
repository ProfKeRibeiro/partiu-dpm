import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { urlAvatarAssinada } from "@/lib/avatar-assinado";
import {
  ALTURA_CARD,
  LARGURA_CARD,
  carregarFontesCard,
  criarElementoCard,
} from "@/lib/card/card";

/**
 * Gera o card de confirmação de participação para o Instagram Story.
 *
 * O uso da foto depende do aceite gravado em `participantes.autoriza_imagem`;
 * sem o aceite o card é gerado com as iniciais (monograma).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ inscricaoId: string }> },
) {
  const { inscricaoId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: erroUsuario } = await supabase.auth.getUser();

  if (erroUsuario || !userData.user) {
    return new Response("Não autorizado.", { status: 401 });
  }

  const { data: inscricao, error: erroInscricao } = await supabase
    .from("inscricoes")
    .select("id, status, evento_id, participante_id")
    .eq("id", inscricaoId)
    .maybeSingle();

  if (erroInscricao || !inscricao) {
    return new Response("Inscrição não encontrada.", { status: 404 });
  }

  if (inscricao.participante_id !== userData.user.id) {
    return new Response("Inscrição não encontrada.", { status: 404 });
  }

  if (inscricao.status !== "confirmada") {
    return new Response("Inscrição não encontrada.", { status: 404 });
  }

  const { data: evento } = await supabase
    .from("eventos")
    .select("titulo")
    .eq("id", inscricao.evento_id)
    .maybeSingle();

  const { data: participante } = await supabase
    .from("participantes")
    .select("nome_completo, autoriza_imagem")
    .eq("id", userData.user.id)
    .maybeSingle();

  // O uso da foto depende do aceite gravado no banco, nunca de um parâmetro
  // de URL enviado pelo cliente.
  const autorizaImagem = participante?.autoriza_imagem === true;

  const metadata = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
  const caminhoAvatar: string | null =
    typeof metadata.avatar_path === "string" && metadata.avatar_path.trim()
      ? (metadata.avatar_path as string).trim()
      : typeof metadata.avatar_url === "string" && metadata.avatar_url.trim()
        ? (
            (
              metadata.avatar_url as string
            ).split("/storage/v1/object/public/avatars/")[1] ?? ""
          ).split("?")[0]
        : null;

  let avatarDataUri: string | null = null;

  if (autorizaImagem && caminhoAvatar) {
    try {
      const avatarUrl = await urlAvatarAssinada(
        supabase,
        userData.user.id,
        caminhoAvatar,
      );

      if (avatarUrl) {
        const respostaAvatar = await fetch(avatarUrl);

        if (respostaAvatar.ok) {
          const buffer = Buffer.from(await respostaAvatar.arrayBuffer());
          const mime = respostaAvatar.headers.get("content-type") ?? "image/png";
          const tipo = mime.startsWith("image/") ? mime : "image/png";
          avatarDataUri = `data:${tipo};base64,${buffer.toString("base64")}`;
        }
      }
    } catch (erro) {
      console.warn("[partiu-dpm] Falha ao carregar avatar para o card.", erro);
    }
  }

  const elemento = criarElementoCard({
    titulo: (evento?.titulo as string | undefined) ?? "Evento",
    nome: (participante?.nome_completo as string | undefined) ?? "",
    avatarDataUri,
  });

  try {
    return new ImageResponse(elemento, {
      width: LARGURA_CARD,
      height: ALTURA_CARD,
      fonts: await carregarFontesCard(),
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (erro) {
    console.error("[partiu-dpm] Falha ao gerar o card de participação.", erro);
    return new Response("Não foi possível gerar o card.", { status: 500 });
  }
}
