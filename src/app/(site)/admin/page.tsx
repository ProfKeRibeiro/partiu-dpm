import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import {
  IconeCalendario,
  IconeEscudo,
  IconeSetaDireita,
  IconeUsuarios,
} from "@/components/ui/icons";
import { usuarioEhAdmin } from "@/lib/auth/sessao";
import { listarEventosAdmin } from "@/lib/admin/consultas";
import { formatarDataCurta, formatarHorario } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Painel administrativo",
  robots: { index: false, follow: false },
};

export const instant = false;

const ROTULOS_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  cancelado: "Cancelado",
  encerrado: "Encerrado",
};

const ESTILOS_STATUS: Record<string, string> = {
  rascunho: "border-line bg-shell text-muted",
  publicado: "border-steel-300 bg-steel-50 text-deep",
  cancelado: "border-ember-300 bg-ember-50 text-molten",
  encerrado: "border-deep/15 bg-papaya text-deep",
};

export default async function AdminPage() {
  await connection();

  if (!isSupabaseConfigured) {
    return (
      <main className="flex-1 bg-canvas py-20">
        <Container>
          <div className="mx-auto max-w-xl rounded-2xl border border-ember-400/40 bg-ember-50 p-8">
            <h1 className="font-display text-2xl font-semibold text-molten">
              Supabase não configurado
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ember-700">
              Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no{" "}
              <code>.env.local</code> para usar o painel administrativo.
            </p>
          </div>
        </Container>
      </main>
    );
  }

  if (!(await usuarioEhAdmin())) {
    return <AcessoRestrito variante="admin" destinoLogin="/admin" />;
  }

  const eventos = await listarEventosAdmin();
  const publicados = eventos.filter(
    (evento) => evento.status === "publicado",
  ).length;
  const totalInscritos = eventos.reduce(
    (total, evento) => total + evento.inscritos,
    0,
  );

  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-papaya">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full border border-brick/15" />

        <Container className="relative py-10 sm:py-14">
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
              href="/conta"
              className="transition-colors hover:text-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Minha área
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-deep">Administração</span>
          </nav>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brick/25 bg-white/70 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-molten">
                <IconeEscudo className="h-3.5 w-3.5" />
                Área restrita
              </p>
              <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
                Painel administrativo
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
                Gerencie inscrições, presenças e certificados dos eventos da DPM.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin/presencas" tamanho="sm">
                Confirmar presenças
              </ButtonLink>
              <ButtonLink href="/conta" variante="contorno" tamanho="sm">
                Minha área
              </ButtonLink>
            </div>
          </div>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-10 sm:py-14">
        <Container>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                rotulo: "Eventos cadastrados",
                valor: eventos.length,
                icone: IconeCalendario,
              },
              {
                rotulo: "Eventos publicados",
                valor: publicados,
                icone: IconeEscudo,
              },
              {
                rotulo: "Inscrições confirmadas",
                valor: totalInscritos,
                icone: IconeUsuarios,
              },
            ].map((indicador) => {
              const Icone = indicador.icone;

              return (
                <div
                  key={indicador.rotulo}
                  className="rounded-2xl border border-deep/10 bg-white p-5 shadow-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-papaya text-steel-700 ring-1 ring-deep/10">
                    <Icone className="h-4 w-4" />
                  </span>
                  <p className="mt-3 font-display text-2xl font-semibold text-deep">
                    {indicador.valor}
                  </p>
                  <p className="text-xs text-muted">{indicador.rotulo}</p>
                </div>
              );
            })}
          </div>

          <section className="mt-8 overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-deep">
                  Eventos
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Selecione um evento para gerenciar as inscrições.
                </p>
              </div>
              <ButtonLink href="/admin/eventos/novo" tamanho="sm">
                Cadastrar evento
                <IconeSetaDireita className="h-4 w-4" />
              </ButtonLink>
            </div>

            {eventos.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-semibold text-deep">
                  Nenhum evento cadastrado.
                </p>
                <p className="mt-1 text-sm text-muted">
                  Cadastre o primeiro evento para começar a divulgar a agenda.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-canvas text-[0.65rem] uppercase tracking-[0.14em] text-muted">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-semibold">
                        Evento
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Data
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Inscritos
                      </th>
                      <th scope="col" className="px-6 py-3 text-right font-semibold">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {eventos.map((evento) => (
                      <tr key={evento.id} className="hover:bg-papaya/30">
                        <td className="max-w-[280px] px-6 py-4">
                          <span className="block truncate font-medium text-deep">
                            {evento.titulo}
                          </span>
                          <span className="mt-0.5 block text-xs capitalize text-muted">
                            {evento.modalidade}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-ink">
                          {formatarDataCurta(evento.inicio)} ·{" "}
                          {formatarHorario(evento.inicio)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${
                              ESTILOS_STATUS[evento.status] ??
                              ESTILOS_STATUS.rascunho
                            }`}
                          >
                            {ROTULOS_STATUS[evento.status] ?? evento.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-ink">
                          {evento.inscritos}
                          {evento.limiteVagas
                            ? ` / ${evento.limiteVagas}`
                            : ""}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/eventos/${evento.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-deep/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-deep transition-colors hover:border-deep/35 hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                          >
                            Gerenciar
                            <IconeSetaDireita className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </Container>
      </main>
    </>
  );
}
