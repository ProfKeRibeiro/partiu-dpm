import Link from "next/link";
import { IconeRelogio, IconeSetaDireita } from "@/components/ui/icons";
import { faixaHorario } from "@/lib/app-utils";
import { partesDaData } from "@/lib/format";

export function ProximoEventoItem({
  id,
  titulo,
  inicio,
  fim,
}: {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
}) {
  const { dia, mes } = partesDaData(inicio);

  return (
    <li>
      <Link
        href={`/eventos/${id}`}
        className="group flex items-center gap-3 rounded-xl px-1.5 py-3 transition-colors hover:bg-papaya/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
      >
        <span className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-deep/10 bg-canvas text-deep">
          <span className="font-display text-base font-bold leading-none">
            {dia}
          </span>
          <span className="mt-1 text-[0.52rem] font-bold uppercase tracking-[0.12em] text-brick">
            {mes}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block line-clamp-2 text-[0.82rem] font-semibold leading-snug text-deep group-hover:text-brick">
            {titulo}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[0.68rem] text-muted">
            <IconeRelogio className="h-3 w-3 text-steel-700" />
            {faixaHorario(inicio, fim)}
          </span>
        </span>

        <IconeSetaDireita className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brick" />
      </Link>
    </li>
  );
}
