import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import { IconeUsuarios } from "@/components/ui/icons";

export function ChamadaFinal() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] border border-deep/20 bg-deep px-6 py-12 sm:px-10 sm:py-14 lg:px-14">
          <div className="pointer-events-none absolute inset-0 bg-grid-clara opacity-60 [mask-image:linear-gradient(to_right,black,transparent_75%)]" />
          <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-brick/20 blur-3xl" />
          <div className="pointer-events-none absolute right-10 top-0 h-px w-40 bg-papaya/30" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-steel-300">
                Sua participação
              </p>
              <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-papaya sm:text-4xl">
                Acompanhe tudo em um só lugar.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-papaya/80 sm:text-base">
                Inscrições, presenças e certificados ficam reunidos na sua área
                do participante.
              </p>
            </div>

            <div className="lg:shrink-0">
              <ButtonLink href="/conta" variante="claro" tamanho="lg">
                <IconeUsuarios className="h-4 w-4" />
                Acessar minha área
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
