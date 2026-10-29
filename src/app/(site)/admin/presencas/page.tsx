import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import {
  IconeCalendario,
  IconeCheck,
  IconeSetaDireita,
  IconeUsuarios,
} from "@/components/ui/icons";
import { listarEventosAdmin } from "@/lib/admin/consultas";
import { usuarioEhAdmin } from "@/lib/auth/sessao";
import { isSupabaseConfigured } from "@/lib/env";
import { formatarDataCurta, formatarHorario } from "@/lib/format";

export const metadata: Metadata = {
  title: "Confirmar presenças",
  robots: { index: false, follow: false },
};

export const instant = false;

/**
 * Ponto de entrada rápido para a chamada do evento. A marcação em si continua
 * na tabela do evento, onde é feita pela RPC administrativa protegida.
 */
export default async function PresencasAdminPage() {
  await connection();

  if (!isSupabaseConfigured) {
    return (
      <main className="flex-1 bg-canvas py-20">
        <Container>
          <p className="mx-auto max-w-xl rounded-2xl border border-ember-400/40 bg-ember-50 p-6 text-sm text-molten">
            Configure o Supabase para registrar presenças.
          </p>
        </Container>
      </main>
    );
  }

  if (!(await usuarioEhAdmin())) {
    return <AcessoRestrito variante="admin" destinoLogin="/admin/presencas" />;
  }

  const eventos = await listarEventosAdmin();

  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-papaya">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <Container className="relative py-10 sm:py-14">
          <nav
            aria-label="Trilha de navegação"
            className="flex items-center gap-2 text-xs text-muted"
          >
            <Link href="/admin" className="hover:text-brick">
              Administração
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-deep">Presenças</span>
          </nav>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-steel-300 bg-white/70 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-deep">
            <IconeCheck className="h-3.5 w-3.5 text-steel-700" />
            Administração
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
            Confirmar presenças
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
            Escolha o evento e marque cada participante que compareceu. Depois
            da confirmação, o certificado poderá ser emitido.
          </p>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-10 sm:py-14">
        <Container>
          {eventos.length === 0 ? (
            <div className="rounded-2xl border border-deep/10 bg-white p-10 text-center shadow-sm">
              <IconeUsuarios className="mx-auto h-6 w-6 text-steel-700" />
              <p className="mt-3 font-semibold text-deep">Nenhum evento cadastrado.</p>
              <ButtonLink href="/admin/eventos/novo" tamanho="sm" className="mt-5">
                Cadastrar evento
              </ButtonLink>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {eventos.map((evento) => (
                <article
                  key={evento.id}
                  className="rounded-2xl border border-deep/10 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-deep">
                        {evento.titulo}
                      </h2>
                      <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                        <IconeCalendario className="h-4 w-4 text-steel-700" />
                        {formatarDataCurta(evento.inicio)} · {formatarHorario(evento.inicio)}
                      </p>
                    </div>
                    <span className="rounded-full bg-papaya px-2.5 py-1 text-xs font-semibold text-deep">
                      {evento.inscritos} inscritos
                    </span>
                  </div>
                  <ButtonLink
                    href={`/admin/eventos/${evento.id}#presencas`}
                    tamanho="sm"
                    className="mt-5"
                  >
                    Registrar presenças
                    <IconeSetaDireita className="h-4 w-4" />
                  </ButtonLink>
                </article>
              ))}
            </div>
          )}
        </Container>
      </main>
    </>
  );
}
