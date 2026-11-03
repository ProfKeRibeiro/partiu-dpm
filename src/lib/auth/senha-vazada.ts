import "server-only";

import { createHash } from "node:crypto";

/**
 * Consulta o HaveIBeenPwned sem enviar a senha.
 *
 * O protocolo de k-anonymity envia apenas os 5 primeiros caracteres do SHA-1
 * da senha. A resposta traz os sufixos correspondentes e a quantidade de
 * vazamentos; a comparação acontece aqui no servidor.
 *
 * Retorna:
 * - `true`  → a senha aparece em vazamentos conhecidos;
 * - `false` → não aparece;
 * - `null`  → não foi possível verificar (serviço fora do ar/timeout).
 *
 * Em `null` o cadastro continua: indisponibilidade do HIBP não deve impedir
 * todo mundo de criar conta. A falha é registrada no log do servidor.
 */
const URL_BASE = "https://api.pwnedpasswords.com/range/";
const TIMEOUT_MS = 3000;

export async function senhaVazada(senha: string): Promise<boolean | null> {
  if (!senha) return null;

  const hash = createHash("sha1").update(senha, "utf8").digest("hex").toUpperCase();
  const prefixo = hash.slice(0, 5);
  const sufixo = hash.slice(5);

  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch(`${URL_BASE}${prefixo}`, {
      headers: {
        "Add-Padding": "true",
        "User-Agent": "partiu-dpm",
      },
      signal: controlador.signal,
      cache: "no-store",
    });

    if (!resposta.ok) {
      console.warn(
        "[partiu-dpm] HIBP indisponível; senha não verificada.",
        resposta.status,
      );
      return null;
    }

    const linhas = (await resposta.text()).split("\n");

    for (const linha of linhas) {
      const [hashSufixo, contagem] = linha.trim().split(":");

      if (hashSufixo?.toUpperCase() === sufixo) {
        return Number(contagem) > 0;
      }
    }

    return false;
  } catch (erro) {
    console.warn("[partiu-dpm] Falha ao consultar o HIBP.", erro);
    return null;
  } finally {
    clearTimeout(limite);
  }
}
