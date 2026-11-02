import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRecuperacao } from "@/components/auth/formulario-recuperacao";
import { Container } from "@/components/ui/container";
import { IconeCadeado } from "@/components/ui/icons";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description:
    "Receba por e-mail um link para redefinir a senha da sua conta do Partiu DPM.",
};

export const instant = false;

export default function RecuperarSenhaPage() {
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
            <span className="text-deep">Recuperar senha</span>
          </nav>

          <p className="mt-6 flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brick">
            <span className="h-px w-7 bg-brick" aria-hidden="true" />
            Acesso à conta
          </p>

          <h1 className="mt-3 max-w-3xl text-balance font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
            Esqueceu a senha? Enviamos um link para você
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink sm:text-base">
            Informe o e-mail cadastrado. O link redefine a senha sem perder suas
            inscrições, presenças ou certificados.
          </p>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-12 sm:py-16">
        <Container>
          <section className="mx-auto max-w-lg rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-deep/10 bg-papaya text-brick">
              <IconeCadeado className="h-5 w-5" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep">
              Redefinir minha senha
            </h2>

            {isSupabaseConfigured ? (
              <FormularioRecuperacao />
            ) : (
              <p className="mt-6 rounded-xl border border-ember-400/40 bg-ember-50 px-4 py-3 text-sm leading-relaxed text-molten">
                O Supabase ainda não está configurado neste ambiente.
              </p>
            )}

            <p className="mt-6 text-xs leading-relaxed text-muted">
              Por segurança, a mensagem de confirmação é sempre a mesma, mesmo
              quando o e-mail não tem conta no Partiu DPM.
            </p>
          </section>
        </Container>
      </main>
    </>
  );
}
