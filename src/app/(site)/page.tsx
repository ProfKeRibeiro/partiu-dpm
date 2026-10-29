import { Suspense } from "react";
import { AvisoPrevia } from "@/components/ui/aviso-previa";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { EventosSkeleton } from "@/components/eventos/estados";
import { ChamadaFinal } from "@/components/home/chamada-final";
import { ComoFunciona } from "@/components/home/como-funciona";
import { EventosDestaque } from "@/components/home/eventos-destaque";
import { Hero } from "@/components/home/hero";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />

      <section
        id="eventos"
        className="scroll-mt-24 bg-canvas py-16 sm:py-20 lg:py-24"
      >
        <Container>
          <SectionHeading
            eyebrow="Agenda"
            titulo="Próximos encontros"
            descricao="Confira o que está chegando e encontre o próximo evento para fazer parte."
          />

          <AvisoPrevia className="mt-6" />

          <Suspense fallback={<EventosSkeleton />}>
            <EventosDestaque />
          </Suspense>
        </Container>
      </section>

      <ComoFunciona />
      <ChamadaFinal />
    </main>
  );
}
