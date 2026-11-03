/**
 * Assinatura de URL do avatar com cache em memória.
 *
 * O bucket `avatars` é privado: cada leitura exige uma URL assinada. Assinar a
 * cada request troca o token e faz o navegador baixar a imagem de novo. Aqui a
 * assinatura é reaproveitada por `avatar_path` enquanto estiver válida, então o
 * mesmo usuário recebe o mesmo href entre renders.
 *
 * O cache vive no processo do servidor (por instância). Se ele reiniciar, a
 * próxima leitura assina de novo — sem impacto funcional.
 */

export const VALIDADE_ASSINATURA_AVATAR_SEGUNDOS = 60 * 60 * 2;
const MARGEM_RENOVACAO_MS = 5 * 60 * 1000;
const VALIDADE_MAXIMA_SEGUNDOS = 60 * 60 * 24 * 7;
const LIMITE_CACHE = 1000;

type Entrada = { url: string; expiraEm: number };

type ClienteComStorage = {
  storage: {
    from(bucket: string): {
      createSignedUrl(
        caminho: string,
        validadeSegundos: number,
      ): Promise<{
        data: { signedUrl: string } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

type GlobalComCache = typeof globalThis & {
  __partiuDpmAvataresAssinados__?: Map<string, Entrada>;
};

const globalComCache = globalThis as GlobalComCache;
const cache =
  globalComCache.__partiuDpmAvataresAssinados__ ?? new Map<string, Entrada>();
globalComCache.__partiuDpmAvataresAssinados__ = cache;

/**
 * Só aceita caminhos dentro da pasta do próprio usuário. Isso evita usar o
 * cache para obter a URL de outra pessoa caso o metadata `avatar_path` seja
 * adulterado no cliente.
 */
export function caminhoAvatarSeguro(
  caminho: string,
  usuarioId: string,
): string | null {
  const limpo = caminho.trim().replace(/^\/+/, "");
  const prefixo = `${usuarioId.trim()}/`;

  if (!limpo || !usuarioId.trim()) return null;
  if (limpo.includes("..") || limpo.includes("\\")) return null;
  if (!limpo.startsWith(prefixo)) return null;

  return limpo;
}

function podarCache(agora: number) {
  if (cache.size < LIMITE_CACHE) return;

  for (const [chave, entrada] of cache) {
    if (entrada.expiraEm <= agora) cache.delete(chave);
  }

  while (cache.size >= LIMITE_CACHE) {
    const maisAntiga = cache.keys().next().value;
    if (typeof maisAntiga !== "string") break;
    cache.delete(maisAntiga);
  }
}

/** Limpa o cache; usado em testes e em troca de foto, se necessário. */
export function limparCacheAvatares() {
  cache.clear();
}

/**
 * Devolve a URL assinada do avatar, reaproveitando a assinatura em cache.
 *
 * Falha de assinatura devolve `null` (o componente usa o fallback) ou, se
 * existir, a URL antiga ainda dentro da validade. Nunca lança.
 */
export async function urlAvatarAssinada(
  cliente: ClienteComStorage,
  usuarioId: string,
  caminho: string,
): Promise<string | null> {
  const caminhoSeguro = caminhoAvatarSeguro(caminho, usuarioId);

  if (!caminhoSeguro) return null;

  const validade = Math.min(
    VALIDADE_ASSINATURA_AVATAR_SEGUNDOS,
    VALIDADE_MAXIMA_SEGUNDOS,
  );
  const agora = Date.now();
  const emCache = cache.get(caminhoSeguro);

  if (emCache && emCache.expiraEm - agora > MARGEM_RENOVACAO_MS) {
    return emCache.url;
  }

  try {
    const { data, error } = await cliente.storage
      .from("avatars")
      .createSignedUrl(caminhoSeguro, validade);

    if (error || !data?.signedUrl) {
      console.warn(
        "[partiu-dpm] Falha ao assinar URL do avatar.",
        error?.message ?? "sem URL",
      );
      cache.delete(caminhoSeguro);
      return emCache && emCache.expiraEm > agora ? emCache.url : null;
    }

    cache.set(caminhoSeguro, {
      url: data.signedUrl,
      expiraEm: agora + validade * 1000,
    });
    podarCache(agora);

    return data.signedUrl;
  } catch (erro) {
    console.warn("[partiu-dpm] Erro ao assinar URL do avatar.", erro);
    cache.delete(caminhoSeguro);
    return emCache && emCache.expiraEm > agora ? emCache.url : null;
  }
}
