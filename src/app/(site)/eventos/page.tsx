import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AgendaCompleta } from "@/components/eventos/agenda-completa";
import { EventosSkeleton } from "@/components/eventos/estados";
import { AvisoPrevia } from "@/components/ui/aviso-previa";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Agenda de eventos",
  description:
    "Confira palestras, oficinas, treinamentos e outros encontros publicados pelo Partiu DPM.",
};

export default function EventosPage() {
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
            <span className="text-deep">Eventos</span>
          </nav>

          <p className="mt-6 flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brick">
            <span className="h-px w-7 bg-brick" aria-hidden="true" />
            Agenda
          </p>

          <h1 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl lg:text-5xl">
            Agenda de eventos
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink sm:text-base">
            Palestras, oficinas, treinamentos e outros encontros da comunidade
            escolar. Confira os detalhes, o público-alvo e as vagas de cada
            atividade.
          </p>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-12 sm:py-16">
        <Container>
          <AvisoPrevia className="mb-8" />
          <Suspense fallback={<EventosSkeleton className="mt-0" />}>
            <AgendaCompleta />
          </Suspense>
        </Container>
      </main>
    </>
  );
}
