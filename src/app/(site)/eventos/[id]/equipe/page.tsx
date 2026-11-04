import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { FormularioCriarEquipe } from "@/components/equipes/formulario-criar-equipe";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import { IconeUsuarios } from "@/components/ui/icons";
import { obterUsuario } from "@/lib/auth/sessao";
import { obterMinhaEquipeNoEvento } from "@/lib/equipes/consultas";
import { buscarEventoPublicado } from "@/lib/eventos";
import { formatarPeriodo } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Criar equipe",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function CriarEquipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const { evento } = await buscarEventoPublicado(id);

  if (!evento) notFound();

  if (!evento.permiteEquipes) {
    return (
      <main className="flex-1 bg-canvas py-16">
        <Container className="max-w-2xl">
          <div className="rounded-2xl border border-ember-300 bg-ember-50 p-6">
            <h1 className="font-display text-xl font-semibold text-molten">
              Este evento não usa equipes
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              A inscrição é individual. Volte para a página do evento para se
              inscrever.
            </p>
            <ButtonLink href={`/eventos/${evento.id}`} className="mt-5">
              Voltar para o evento
            </ButtonLink>
          </div>
        </Container>
      </main>
    );
  }

  const usuario = isSupabaseConfigured ? await obterUsuario() : null;

  if (!usuario) {
    return (
      <AcessoRestrito
        variante="sessao"
        destinoLogin={`/eventos/${evento.id}/equipe`}
      />
    );
  }

  const equipeAtual = await obterMinhaEquipeNoEvento(evento.id);

  if (equipeAtual) {
    redirect(`/equipes/${equipeAtual.codigo}`);
  }

  return (
    <main className="flex-1 bg-canvas py-10 sm:py-14">
      <Container className="max-w-2xl">
        <nav
          aria-label="Trilha de navegação"
          className="flex flex-wrap items-center gap-2 text-xs text-muted"
        >
          <Link href="/eventos" className="hover:text-brick">
            Eventos
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/eventos/${evento.id}`}
            className="hover:text-brick"
          >
            {evento.titulo}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-deep">Criar equipe</span>
        </nav>

        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-brick/25 bg-white px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-molten">
          <IconeUsuarios className="h-3.5 w-3.5" />
          Inscrição em equipe
        </p>

        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
          Criar equipe
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          {evento.titulo} · {formatarPeriodo(evento.inicio, evento.fim)} ·{" "}
          {evento.equipeMin} a {evento.equipeMax} membros.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Ao criar a equipe você vira o líder e já garante a sua vaga. Depois,
          compartilhe o código para os colegas entrarem.
        </p>

        <div className="mt-8 rounded-2xl border border-deep/10 bg-white p-5 shadow-sm sm:p-6">
          <FormularioCriarEquipe
            eventoId={evento.id}
            exigeOrientador={evento.exigeOrientador}
          />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link
            href={`/eventos/${evento.id}`}
            className="font-semibold text-brick underline underline-offset-4 hover:text-molten"
          >
            Voltar para o evento
          </Link>
        </p>
      </Container>
    </main>
  );
}
