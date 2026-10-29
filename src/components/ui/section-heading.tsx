import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  titulo,
  descricao,
  acao,
  className = "",
}: {
  eyebrow?: string;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brick">
            <span className="h-px w-7 bg-brick" aria-hidden="true" />
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
          {titulo}
        </h2>
        {descricao ? (
          <p className="mt-3 text-base leading-relaxed text-muted">
            {descricao}
          </p>
        ) : null}
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}
