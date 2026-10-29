import type { ReactNode } from "react";
import { IconeInfo } from "@/components/ui/icons";

export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
  className = "",
}: {
  icone: ReactNode;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-dashed border-deep/20 bg-white px-6 py-10 text-center ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-papaya text-steel-700 ring-1 ring-deep/10">
        {icone}
      </span>
      <p className="mt-4 text-sm font-semibold text-deep">{titulo}</p>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
        {descricao}
      </p>
      {acao ? <div className="mt-5">{acao}</div> : null}
    </div>
  );
}

export function AvisoApp({
  children,
  tom = "info",
  className = "",
}: {
  children: ReactNode;
  tom?: "info" | "alerta";
  className?: string;
}) {
  const estilos =
    tom === "alerta"
      ? "border-ember-200 bg-ember-50 text-molten"
      : "border-deep/10 bg-shell/70 text-muted";

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs leading-relaxed ${estilos} ${className}`}
    >
      <IconeInfo className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function ShellCarregando() {
  return (
    <div className="min-h-screen bg-canvas" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando sua área...</span>
      <div className="fixed inset-y-0 left-0 hidden w-[272px] bg-deep lg:block">
        <div className="flex h-[7.5rem] items-center justify-center border-b border-papaya/10 px-5">
          <div className="h-16 w-16 animate-pulse rounded-full bg-papaya/15" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <div
              key={indice}
              className="h-11 animate-pulse rounded-xl bg-papaya/[0.07]"
            />
          ))}
        </div>
      </div>
      <div className="lg:pl-[272px]">
        <div className="flex h-[4.5rem] items-center gap-3 border-b border-deep/10 bg-white px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-full max-w-[34rem] animate-pulse rounded-full bg-shell" />
          <div className="ml-auto h-9 w-9 animate-pulse rounded-full bg-deep/10" />
        </div>
        <div className="mx-auto w-full max-w-[1360px] space-y-6 px-5 py-8 sm:px-6 lg:px-8">
          <div className="h-44 animate-pulse rounded-2xl bg-deep/10" />
          <div className="grid gap-5 sm:grid-cols-2 min-[1500px]:grid-cols-3">
            {Array.from({ length: 3 }).map((_, indice) => (
              <div
                key={indice}
                className="h-72 animate-pulse rounded-2xl border border-deep/10 bg-white"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConteudoCarregando() {
  return (
    <div className="mx-auto w-full max-w-[1360px] space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <div className="h-10 w-56 animate-pulse rounded-lg bg-deep/10" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, indice) => (
          <div
            key={indice}
            className="h-80 animate-pulse rounded-2xl border border-deep/10 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
