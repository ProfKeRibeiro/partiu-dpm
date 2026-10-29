import Image from "next/image";
import Link from "next/link";
import {
  eventoRealizado,
  rotuloTipo,
  situacaoInscricao,
  textoVagas,
} from "@/lib/evento-utils";
import { formatarPeriodo, partesDaData } from "@/lib/format";
import type { Evento, Modalidade } from "@/types/evento";
import { SeloModalidade, SeloStatus } from "@/components/eventos/selos";
import {
  IconeBilhete,
  IconeCalendario,
  IconeGlobo,
  IconeLocal,
  IconeSetaDireita,
  IconeUsuarios,
} from "@/components/ui/icons";

const gradientes: Record<Modalidade, string> = {
  presencial: "from-deep via-navy-800 to-steel-800",
  online: "from-navy-800 via-navy-900 to-deep",
  hibrida: "from-molten via-brick to-deep",
};

export function EventoCard({
  evento,
  agora,
}: {
  evento: Evento;
  agora: Date;
}) {
  const situacao = situacaoInscricao(evento, agora);
  const realizado = eventoRealizado(evento, agora);
  const { dia, mes } = partesDaData(evento.inicio);
  const localExibido =
    evento.modalidade === "online"
      ? (evento.local ?? "Online")
      : (evento.local ?? "Local a confirmar");

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-sm transition duration-200 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brick hover:-translate-y-0.5 hover:border-deep/20 hover:shadow-suave">
      <div
        className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${gradientes[evento.modalidade]}`}
      >
        {evento.imagemUrl ? (
          <>
            <Image
              src={evento.imagemUrl}
              alt=""
              fill
              unoptimized={evento.imagemUrl.startsWith("http")}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep/75 via-deep/15 to-deep/25" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-grid-clara opacity-70" />
            <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full border border-papaya/15" />
            <div className="absolute right-8 top-16 h-20 w-20 rotate-12 rounded-2xl border border-papaya/15" />
            <IconeBilhete className="absolute -bottom-2 right-5 h-24 w-24 text-papaya/15" />
          </>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
          <SeloStatus
            situacao={situacao}
            realizado={realizado}
            className={realizado ? undefined : "ring-1 ring-papaya/25"}
          />
          <SeloModalidade modalidade={evento.modalidade} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-papaya text-deep ring-1 ring-deep/10">
            <span className="font-display text-lg font-bold leading-none">
              {dia}
            </span>
            <span className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-brick">
              {mes}
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brick">
              {rotuloTipo(evento.tipo)}
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-deep">
              <Link
                href={`/eventos/${evento.id}`}
                className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-brick"
              >
                {evento.titulo}
              </Link>
            </h3>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-[0.92rem] leading-relaxed text-muted">
          {evento.descricao ||
            "Mais informações sobre este encontro serão divulgadas em breve."}
        </p>

        <ul className="mt-4 space-y-2 text-sm text-ink">
          <li className="flex items-start gap-2">
            <IconeCalendario className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
            <span>{formatarPeriodo(evento.inicio, evento.fim)}</span>
          </li>
          <li className="flex items-start gap-2">
            {evento.modalidade === "online" ? (
              <IconeGlobo className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
            ) : (
              <IconeLocal className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
            )}
            <span>{localExibido}</span>
          </li>
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <IconeUsuarios className="h-4 w-4 text-steel-700" />
            {textoVagas(evento)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-deep group-hover:text-brick">
            Ver detalhes
            <IconeSetaDireita className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
