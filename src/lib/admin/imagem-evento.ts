import type { SupabaseClient } from "@supabase/supabase-js";

export const TAMANHO_MAXIMO_IMAGEM_EVENTO = 5 * 1024 * 1024;

const TIPOS_IMAGEM_EVENTO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ResultadoImagemEvento =
  | { ok: true; url: string; caminho: string }
  | { ok: false; erro: string };

function extensaoDaImagem(arquivo: File) {
  return TIPOS_IMAGEM_EVENTO[arquivo.type] ?? null;
}

export function validarImagemEvento(
  arquivo: File,
): { ok: true; extensao: string } | { ok: false; erro: string } {
  const extensao = extensaoDaImagem(arquivo);

  if (!extensao) {
    return { ok: false, erro: "Use uma imagem JPG, PNG ou WebP." };
  }

  if (arquivo.size <= 0) {
    return { ok: false, erro: "O arquivo de imagem está vazio." };
  }

  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_EVENTO) {
    return { ok: false, erro: "A imagem deve ter no máximo 5 MB." };
  }

  return { ok: true, extensao };
}

/**
 * Sobe a arte do evento para o bucket público `eventos`.
 *
 * O nome é sempre gerado no servidor (`<uuid>.<ext>`), então o formulário não
 * consegue escolher caminho nem sobrescrever outro arquivo. A URL devolvida é
 * a pública do bucket, que é o que vai para `eventos.imagem_url`.
 */
export async function enviarImagemEventoParaStorage(
  supabase: SupabaseClient,
  arquivo: File,
): Promise<ResultadoImagemEvento> {
  const validacao = validarImagemEvento(arquivo);

  if (!validacao.ok) return validacao;

  const caminho = `${crypto.randomUUID()}.${validacao.extensao}`;
  const bucket = supabase.storage.from("eventos");

  const { error } = await bucket.upload(caminho, arquivo, {
    cacheControl: "60",
    contentType: arquivo.type,
    upsert: false,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao enviar imagem do evento.", error);
    return { ok: false, erro: "Não foi possível enviar a imagem. Tente novamente." };
  }

  const { data } = bucket.getPublicUrl(caminho);

  if (!data?.publicUrl) {
    console.error("[partiu-dpm] Imagem enviada sem URL pública.", caminho);
    await bucket.remove([caminho]);
    return { ok: false, erro: "Não foi possível gerar a URL da imagem." };
  }

  return { ok: true, url: data.publicUrl, caminho };
}
