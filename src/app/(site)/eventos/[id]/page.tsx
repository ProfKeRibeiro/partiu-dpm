import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { DetalheEvento } from "@/components/eventos/detalhe-evento";
import { buscarEventoPublicado } from "@/lib/eventos";
import { formatarDataExtensa, formatarHorario } from "@/lib/format";

const DESCRICAO_PADRAO =
  "Informações completas sobre o evento: data, local, público-alvo, vagas e inscrições.";

function resumirDescricao(texto: string) {
  const limpo = texto.replace(/\s+/g, " ").trim();

  if (!limpo) return "";
  if (limpo.length <= 155) return limpo;

  return `${limpo.slice(0, 152).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { evento } = await buscarEventoPublicado(id);

  if (!evento) {
    return {
      title: "Detalhes do evento",
      description: DESCRICAO_PADRAO,
    };
  }

  const data = formatarDataExtensa(evento.inicio);
  const horario = formatarHorario(evento.inicio);
  const resumo = resumirDescricao(evento.descricao);
  const descricao =
    resumo ||
    `${evento.titulo} em ${data}, às ${horario}. Confira os detalhes e inscreva-se pelo Partiu DPM.`;
  const imagens = evento.imagemUrl ? [{ url: evento.imagemUrl }] : undefined;

  return {
    title: evento.titulo,
    description: descricao,
    alternates: { canonical: `/eventos/${evento.id}` },
    openGraph: {
      type: "article",
      locale: "pt_BR",
      url: `/eventos/${evento.id}`,
      siteName: "Partiu DPM",
      title: evento.titulo,
      description: descricao,
      images: imagens,
    },
    twitter: {
      card: imagens ? "summary_large_image" : "summary",
      title: evento.titulo,
      description: descricao,
      images: imagens,
    },
  };
}

function DetalheEventoSkeleton() {
  return (
    <>
      <div className="border-b border-line bg-papaya">
        <Container className="py-12 sm:py-16">
          <div className="h-3 w-48 animate-pulse rounded bg-deep/10" />
          <div className="mt-6 flex gap-2">
            <div className="h-6 w-32 animate-pulse rounded-full bg-deep/10" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-deep/10" />
          </div>
          <div className="mt-6 h-10 w-full max-w-3xl animate-pulse rounded bg-deep/10" />
          <div className="mt-3 h-10 w-2/3 animate-pulse rounded bg-deep/10" />
          <div className="mt-6 h-4 w-72 animate-pulse rounded bg-deep/10" />
        </Container>
      </div>
      <main className="bg-canvas py-12 sm:py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <div className="h-52 animate-pulse rounded-2xl border border-line bg-white" />
              <div className="h-40 animate-pulse rounded-2xl border border-line bg-white" />
              <div className="h-48 animate-pulse rounded-2xl border border-line bg-white" />
            </div>
            <div className="h-96 animate-pulse rounded-2xl border border-line bg-white" />
          </div>
        </Container>
      </main>
    </>
  );
}

export default function EventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetalheEventoSkeleton />}>
      <DetalheEvento params={params} />
    </Suspense>
  );
}
