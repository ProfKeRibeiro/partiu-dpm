import Image from "next/image";
import Link from "next/link";
import { SeloModalidade } from "@/components/eventos/selos";
import {
  IconeBilhete,
  IconeCalendario,
  IconeCheck,
  IconeGlobo,
  IconeLocal,
  IconeRelogio,
  IconeSetaDireita,
  IconeUsuarios,
} from "@/components/ui/icons";
import { faixaHorario } from "@/lib/app-utils";
import {
  ROTULOS_PUBLICO,
  rotuloTipo,
  textoVagas,
} from "@/lib/evento-utils";
import { formatarDiaMes } from "@/lib/format";
import type { Evento, Modalidade } from "@/types/evento";

const gradientes: Record<Modalidade, string> = {
  presencial: "from-deep via-navy-800 to-steel-800",
  online: "from-navy-800 via-navy-900 to-deep",
  hibrida: "from-molten via-brick to-deep",
};

const tonsTipo: Record<string, string> = {
  palestra: "bg-brick text-white",
  oficina: "bg-steel-700 text-white",
  curso: "bg-deep text-papaya",
  treinamento: "bg-molten text-white",
  workshop: "bg-steel-700 text-white",
  seminario: "bg-deep text-papaya",
  feira: "bg-brick text-white",
  encontro: "bg-steel-700 text-white",
};

export function CartaoEventoApp({
  evento,
  inscrito = false,
}: {
  evento: Evento;
  inscrito?: boolean;
}) {
  const local =
    evento.modalidade === "online"
      ? (evento.local ?? "Online")
      : (evento.local ?? "Local a confirmar");
  const horario = faixaHorario(evento.inicio, evento.fim);
  const tom = tonsTipo[evento.tipo.trim().toLowerCase()] ?? "bg-deep text-papaya";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-sm transition duration-200 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brick hover:-translate-y-0.5 hover:border-deep/20 hover:shadow-suave">
      <div
        className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${gradientes[evento.modalidade]}`}
      >
        {evento.imagemUrl ? (
          <>
            <Image
              src={evento.imagemUrl}
              alt=""
              fill
              unoptimized={evento.imagemUrl.startsWith("http")}
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep/80 via-deep/10 to-deep/30" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-grid-clara opacity-70" />
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border border-papaya/15" />
            <div className="absolute right-7 top-14 h-16 w-16 rotate-12 rounded-2xl border border-papaya/15" />
            <IconeBilhete className="absolute -bottom-2 right-5 h-20 w-20 text-papaya/15" />
          </>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
          <span
            className={`inline-flex rounded-md px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] shadow-sm ${tom}`}
          >
            {rotuloTipo(evento.tipo)}
          </span>
          <SeloModalidade modalidade={evento.modalidade} />
        </div>

        {inscrito ? (
          <span className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full border border-papaya/30 bg-deep/90 px-2.5 py-1 text-[0.62rem] font-semibold text-papaya backdrop-blur-sm">
            <IconeCheck className="h-3 w-3" />
            Você está inscrito
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-display text-[1.05rem] font-semibold leading-snug text-deep">
          <Link
            href={`/eventos/${evento.id}`}
            className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-brick"
          >
            {evento.titulo}
          </Link>
        </h3>

        <ul className="mt-3 space-y-2 text-[0.82rem] leading-snug text-ink">
          <li className="flex items-start gap-2">
            <IconeCalendario className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
            <span>{formatarDiaMes(evento.inicio)}</span>
          </li>
          <li className="flex items-start gap-2">
            <IconeRelogio className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
            <span>{horario}</span>
          </li>
          <li className="flex items-start gap-2">
            {evento.modalidade === "online" ? (
              <IconeGlobo className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
            ) : (
              <IconeLocal className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
            )}
            <span className="line-clamp-1">{local}</span>
          </li>
          <li className="flex items-start gap-2">
            <IconeUsuarios className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
            <span className="line-clamp-1">
              {ROTULOS_PUBLICO[evento.publicoAlvo]}
            </span>
          </li>
        </ul>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-[0.68rem] font-medium text-muted">
            {textoVagas(evento)}
          </span>
          <span className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-deep group-hover:text-brick">
            Ver evento
            <IconeSetaDireita className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
