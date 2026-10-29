import type { ReactNode } from "react";
import { AppContainer } from "@/components/app/container";

export function CabecalhoApp({
  eyebrow,
  titulo,
  descricao,
  acao,
}: {
  eyebrow: string;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <header className="border-b border-line bg-white">
      <AppContainer className="py-7 sm:py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brick">
              <span className="h-px w-6 bg-brick" aria-hidden="true" />
              {eyebrow}
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-deep sm:text-3xl">
              {titulo}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {descricao}
            </p>
          </div>
          {acao ? <div className="shrink-0">{acao}</div> : null}
        </div>
      </AppContainer>
    </header>
  );
}
