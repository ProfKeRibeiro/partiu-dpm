import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SessaoAtiva } from "@/components/auth/acesso-restrito";
import { FormularioAcesso } from "@/components/auth/formulario-acesso";
import { Container } from "@/components/ui/container";
import {
  IconeCalendario,
  IconeCertificado,
  IconeEscudo,
  IconeUsuarios,
} from "@/components/ui/icons";
import { obterUsuario } from "@/lib/auth/sessao";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Área do participante",
  description:
    "Entre ou crie sua conta para se inscrever nos eventos, acompanhar presenças e acessar certificados do Partiu DPM.",
};

// A página lê cookies e searchParams para redirecionar quem já está logado.
export const instant = false;

const recursos = [
  {
    texto: "Inscreva-se nos eventos e acompanhe suas vagas",
    icone: IconeCalendario,
  },
  {
    texto: "Atualize seu perfil e veja suas presenças",
    icone: IconeUsuarios,
  },
  {
    texto: "Baixe certificados com código de validação",
    icone: IconeCertificado,
  },
] as const;

function destinoSeguro(valor: string | undefined) {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) {
    return "/conta";
  }

  return valor.startsWith("/entrar") ? "/conta" : valor;
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; next?: string }>;
}) {
  await connection();

  const params = await searchParams;

  if (isSupabaseConfigured) {
    const usuario = await obterUsuario();
    if (usuario) return <SessaoAtiva email={usuario.email} />;
  }

  const modo = params.modo === "criar" ? "criar" : "entrar";
  const next = destinoSeguro(params.next);

  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-papaya">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full border border-steel/25" />
        <div className="pointer-events-none absolute -right-6 top-0 h-40 w-40 rounded-full border border-brick/15" />

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
            <span className="text-deep">Área do participante</span>
          </nav>

          <p className="mt-6 flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brick">
            <span className="h-px w-7 bg-brick" aria-hidden="true" />
            Acesso à conta
          </p>

          <h1 className="mt-3 max-w-3xl text-balance font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
            {modo === "criar"
              ? "Crie sua conta e garanta sua vaga"
              : "Entre para acompanhar sua participação"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink sm:text-base">
            Inscrições, presenças e certificados dos eventos da DPM em um só
            lugar, com seus dados protegidos.
          </p>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-12 sm:py-16">
        <Container>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-start">
            <section className="rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-8">
              <div className="h-1.5 w-14 rounded-full bg-brick" />
              <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep">
                {modo === "criar" ? "Criar conta" : "Acessar minha conta"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {modo === "criar"
                  ? "Informe seu nome completo, e-mail e uma senha. O nome aparece no certificado."
                  : "Use o e-mail e a senha cadastrados no Partiu DPM."}
              </p>

              {isSupabaseConfigured ? (
                <FormularioAcesso modo={modo} next={next} />
              ) : (
                <p className="mt-6 rounded-xl border border-ember-400/40 bg-ember-50 px-4 py-3 text-sm leading-relaxed text-molten">
                  O Supabase ainda não está configurado neste ambiente. Defina
                  as variáveis públicas no <code>.env.local</code> para habilitar
                  login e cadastro.
                </p>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-deep/20 bg-deep p-6 text-papaya shadow-suave sm:p-8">
                <p className="inline-flex items-center gap-2 rounded-full border border-papaya/20 bg-papaya/10 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-papaya">
                  <IconeEscudo className="h-3.5 w-3.5 text-steel-300" />
                  Conta segura
                </p>

                <ul className="mt-6 space-y-4">
                  {recursos.map((recurso) => {
                    const Icone = recurso.icone;

                    return (
                      <li
                        key={recurso.texto}
                        className="flex items-start gap-3 text-sm leading-relaxed text-papaya/85"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-papaya/15 bg-papaya/10 text-steel-300">
                          <Icone className="h-4 w-4" />
                        </span>
                        {recurso.texto}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-2xl border border-deep/10 bg-white p-5">
                <p className="text-xs leading-relaxed text-muted">
                  A organização nunca solicita sua senha. A confirmação de e-mail
                  é feita pelo Supabase Auth, e seus dados ficam protegidos por
                  RLS.
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </main>
    </>
  );
}
