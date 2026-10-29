"use client";

import { useEffect } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import { IconeAlerta } from "@/components/ui/icons";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <SiteHeader estadoSessao="carregando" />
      <main
        id="conteudo"
        className="flex flex-1 items-center bg-canvas py-20 sm:py-28"
      >
        <Container>
          <div className="mx-auto max-w-lg text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ember-50 text-molten ring-1 ring-ember-200">
              <IconeAlerta className="h-6 w-6" />
            </span>
            <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-brick">
              Algo deu errado
            </p>
            <h1 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
              Não foi possível carregar esta página
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Tente novamente em alguns instantes. Se o problema continuar,
              procure a organização do portal.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                Tentar novamente
              </button>
              <ButtonLink href="/" variante="contorno">
                Voltar ao início
              </ButtonLink>
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
