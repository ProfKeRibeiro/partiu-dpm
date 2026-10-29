import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import {
  IconeAlerta,
  IconeCalendario,
  IconeSetaDireita,
} from "@/components/ui/icons";

export function EventosSkeleton({
  quantidade = 3,
  className = "",
}: {
  quantidade?: number;
  className?: string;
}) {
  return (
    <div
      className={`mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: quantidade }).map((_, indice) => (
        <div
          key={indice}
          className="animate-pulse overflow-hidden rounded-2xl border border-line bg-white"
        >
          <div className="aspect-[16/10] bg-deep/[0.06]" />
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex gap-4">
              <div className="h-14 w-14 rounded-xl bg-deep/[0.06]" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-2.5 w-20 rounded bg-deep/[0.08]" />
                <div className="h-4 w-full rounded bg-deep/10" />
                <div className="h-4 w-3/4 rounded bg-deep/10" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-deep/[0.06]" />
            <div className="h-3 w-5/6 rounded bg-deep/[0.06]" />
            <div className="h-3 w-2/3 rounded bg-deep/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EventosVazio({
  titulo = "A agenda está sendo preparada",
  descricao = "Novos encontros serão publicados em breve. Volte para conferir as próximas novidades.",
}: {
  titulo?: string;
  descricao?: string;
}) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-deep/20 bg-white px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-papaya text-steel-700 ring-1 ring-deep/10">
        <IconeCalendario className="h-6 w-6" />
      </span>
      <h3 className="mt-5 font-display text-xl font-semibold text-deep">
        {titulo}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        {descricao}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-deep underline-offset-4 hover:text-brick hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
      >
        Ir para o início
        <IconeSetaDireita className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function EventosErro() {
  return (
    <div
      role="alert"
      className="mt-10 flex flex-col items-center rounded-2xl border border-ember-300/70 bg-ember-50 px-6 py-14 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-molten ring-1 ring-ember-200">
        <IconeAlerta className="h-6 w-6" />
      </span>
      <h3 className="mt-5 font-display text-xl font-semibold text-molten">
        Não foi possível carregar a agenda agora
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ember-700">
        Tente novamente em alguns instantes. Se o problema continuar, procure a
        organização do evento.
      </p>
      <ButtonLink
        href="/eventos"
        variante="contorno"
        tamanho="sm"
        className="mt-6"
      >
        Tentar novamente
      </ButtonLink>
    </div>
  );
}
