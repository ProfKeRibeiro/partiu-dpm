/**
 * Normaliza o parâmetro `next` usado em login, cadastro e confirmação de
 * e-mail para um caminho interno conhecido.
 *
 * A verificação anterior só rejeitava `//`, mas aceitava `/\evil.com`: o
 * navegador trata `\` como `/` e o redirecionamento saía do site. Aqui o valor
 * é interpretado como URL, a origem é conferida e o caminho precisa estar em
 * uma lista fechada de rotas internas.
 */
const BASE = "https://interno.invalid";

const ROTAS_PERMITIDAS = [
  "/conta",
  "/admin",
  "/eventos",
  "/certificados",
  "/redefinir-senha",
] as const;

export function destinoSeguroInterno(
  valor: unknown,
  padrao = "/conta",
): string {
  if (typeof valor !== "string") return padrao;

  const bruto = valor.trim();
  if (!bruto) return padrao;

  // Barra invertida e sua forma percent-encoded são normalizadas pelo
  // navegador como barra; nunca devem chegar ao redirect.
  if (/\\|%5c/i.test(bruto)) return padrao;

  let url: URL;

  try {
    url = new URL(bruto, BASE);
  } catch {
    return padrao;
  }

  if (url.origin !== BASE) return padrao;
  if (url.username || url.password) return padrao;

  const caminho = url.pathname;
  const permitida = ROTAS_PERMITIDAS.some(
    (rota) => caminho === rota || caminho.startsWith(`${rota}/`),
  );

  if (!permitida) return padrao;

  return `${caminho}${url.search}${url.hash}`;
}
