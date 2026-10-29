import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import { IconeCalendario } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader estadoSessao="carregando" />
      <main
        id="conteudo"
        className="flex flex-1 items-center bg-canvas py-20 sm:py-28"
      >
        <Container>
          <div className="mx-auto max-w-lg text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-papaya text-steel-700 ring-1 ring-deep/10">
              <IconeCalendario className="h-6 w-6" />
            </span>
            <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-brick">
              Erro 404
            </p>
            <h1 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
              Página não encontrada
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              O endereço pode ter mudado ou o evento não está mais disponível.
              Confira a agenda para encontrar o que procura.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/eventos">Ver eventos</ButtonLink>
              <ButtonLink href="/" variante="contorno">
                Ir para o início
              </ButtonLink>
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
