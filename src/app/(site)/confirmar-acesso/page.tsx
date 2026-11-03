import type { Metadata } from "next";
import Link from "next/link";
import { confirmarAcesso } from "./acoes";
import { Container } from "@/components/ui/container";
import { destinoSeguroInterno } from "@/lib/rota-segura";

export const metadata: Metadata = {
  title: "Confirmar acesso",
  description: "Confirme que é você para concluir o acesso à sua conta.",
  robots: { index: false, follow: false },
};

// A página lê searchParams (token do e-mail) e não deve ser pré-renderizada.
export const instant = false;

/**
 * Página neutra para scanners de e-mail.
 *
 * O render não chama o Supabase: apenas mostra o botão. A verificação do
 * `token_hash` acontece no POST da Server Action, então abrir o link (inclusive
 * por um scanner) não consome o token.
 */
export default async function ConfirmarAcessoPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const tokenHash =
    typeof params.token_hash === "string" ? params.token_hash : "";
  const tipo = typeof params.type === "string" ? params.type : "";
  const next = typeof params.next === "string" ? params.next : "";
  const destino = next ? destinoSeguroInterno(next) : "";
  const linkValido = Boolean(tokenHash && tipo);

  return (
    <main className="flex-1 bg-canvas py-12 sm:py-16">
      <Container>
        <section className="mx-auto max-w-xl rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-8">
          <div className="h-1.5 w-14 rounded-full bg-brick" />

          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep sm:text-3xl">
            Confirme que é você para continuar
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            Por segurança, a verificação do link só acontece quando você clicar
            no botão abaixo. Isso evita que um leitor automático de e-mails use
            seu link antes de você.
          </p>

          {linkValido ? (
            <form action={confirmarAcesso} className="mt-6 space-y-4">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={tipo} />
              {destino ? (
                <input type="hidden" name="next" value={destino} />
              ) : null}

              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brick px-5 text-sm font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
              >
                Continuar
              </button>
            </form>
          ) : (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-ember-400/40 bg-ember-50 px-4 py-3 text-sm leading-relaxed text-molten"
            >
              Este link está incompleto ou inválido. Peça um novo link de
              recuperação de senha.
            </p>
          )}

          <p className="mt-6 text-xs leading-relaxed text-muted">
            Se você já clicou neste link antes e ele não funcionou, o token pode
            ter sido usado.{" "}
            <Link
              href="/recuperar-senha"
              className="font-semibold text-brick underline underline-offset-4 hover:text-molten"
            >
              Pedir um novo link
            </Link>
            .
          </p>

          <p className="mt-2 text-xs leading-relaxed text-muted">
            Prefere entrar com senha?{" "}
            <Link
              href="/entrar"
              className="font-semibold text-brick underline underline-offset-4 hover:text-molten"
            >
              Ir para o login
            </Link>
            .
          </p>
        </section>
      </Container>
    </main>
  );
}
