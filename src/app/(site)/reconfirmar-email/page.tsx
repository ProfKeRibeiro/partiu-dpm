import type { Metadata } from "next";
import Link from "next/link";
import { FormularioReenvioConfirmacao } from "@/components/auth/formulario-reenvio-confirmacao";
import { Container } from "@/components/ui/container";
import { IconeEscudo } from "@/components/ui/icons";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Reenviar confirmação",
  description:
    "Reenvie o e-mail de confirmação da sua conta do Partiu DPM.",
};

export const instant = false;

export default function ReconfirmarEmailPage() {
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-papaya">
        <Container className="relative py-12 sm:py-16">
          <nav
            aria-label="Trilha de navegação"
            className="flex items-center gap-2 text-xs text-muted"
          >
            <Link
              href="/"
              className="transition-colors hover:text-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Início
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/entrar"
              className="transition-colors hover:text-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Área do participante
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-deep">Reenviar confirmação</span>
          </nav>

          <h1 className="mt-6 max-w-3xl text-balance font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
            Reenviar o e-mail de confirmação
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink sm:text-base">
            Use esta página se o link anterior expirou ou não chegou. O novo link
            também entra direto na sua conta.
          </p>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-12 sm:py-16">
        <Container>
          <section className="mx-auto max-w-lg rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-deep/10 bg-papaya text-brick">
              <IconeEscudo className="h-5 w-5" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep">
              Confirmação de e-mail
            </h2>

            {isSupabaseConfigured ? (
              <FormularioReenvioConfirmacao />
            ) : (
              <p className="mt-6 rounded-xl border border-ember-400/40 bg-ember-50 px-4 py-3 text-sm leading-relaxed text-molten">
                O Supabase ainda não está configurado neste ambiente.
              </p>
            )}
          </section>
        </Container>
      </main>
    </>
  );
}
