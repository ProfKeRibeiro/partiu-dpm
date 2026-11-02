import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FormularioNovaSenha } from "@/components/auth/formulario-nova-senha";
import { Container } from "@/components/ui/container";
import { IconeAlerta, IconeCadeado } from "@/components/ui/icons";
import { obterUsuario } from "@/lib/auth/sessao";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Definir nova senha",
  description: "Defina a nova senha da sua conta do Partiu DPM.",
};

export const instant = false;

export default async function RedefinirSenhaPage() {
  await connection();

  const usuario = isSupabaseConfigured ? await obterUsuario() : null;

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
            <span className="text-deep">Nova senha</span>
          </nav>

          <h1 className="mt-6 max-w-3xl text-balance font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
            Defina a nova senha da sua conta
          </h1>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-12 sm:py-16">
        <Container>
          <section className="mx-auto max-w-lg rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-8">
            {usuario ? (
              <>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-deep/10 bg-papaya text-brick">
                  <IconeCadeado className="h-5 w-5" />
                </span>
                <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep">
                  Nova senha
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Você está definindo a senha de{" "}
                  <span className="font-semibold text-deep">
                    {usuario.email}
                  </span>
                  . Ao salvar, sua sessão continua aberta.
                </p>
                <FormularioNovaSenha />
              </>
            ) : (
              <>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-ember-400/40 bg-ember-50 text-molten">
                  <IconeAlerta className="h-5 w-5" />
                </span>
                <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep">
                  Link expirado ou já usado
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  O link de recuperação vale por uma hora e precisa ser aberto no
                  mesmo navegador em que foi pedido. Peça um novo link para
                  continuar.
                </p>
                <Link
                  href="/recuperar-senha"
                  className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                >
                  Pedir novo link
                </Link>
              </>
            )}
          </section>
        </Container>
      </main>
    </>
  );
}
