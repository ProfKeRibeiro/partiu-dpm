import type { Modalidade, SituacaoInscricao } from "@/types/evento";
import { ROTULOS_MODALIDADE, ROTULOS_SITUACAO } from "@/lib/evento-utils";
import { IconeBrilho, IconeGlobo, IconeLocal } from "@/components/ui/icons";

const estilosSituacao: Record<
  SituacaoInscricao,
  { ponto: string; chip: string }
> = {
  aberta: {
    ponto: "bg-steel-300",
    chip: "bg-deep text-papaya shadow-sm",
  },
  "em-breve": {
    ponto: "bg-brick",
    chip: "border border-brick/25 bg-papaya text-molten shadow-sm",
  },
  encerrada: {
    ponto: "bg-muted/70",
    chip: "bg-white text-ink shadow-sm ring-1 ring-deep/10",
  },
  lotado: {
    ponto: "bg-white/80",
    chip: "bg-brick text-white shadow-sm",
  },
};

export function SeloStatus({
  situacao,
  realizado = false,
  className = "",
}: {
  situacao: SituacaoInscricao;
  realizado?: boolean;
  className?: string;
}) {
  if (realizado) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-deep/90 px-2.5 py-1 text-[0.68rem] font-semibold text-papaya shadow-sm backdrop-blur-sm ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-steel-300" />
        Evento realizado
      </span>
    );
  }

  const estilo = estilosSituacao[situacao];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${estilo.chip} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${estilo.ponto}`} />
      {ROTULOS_SITUACAO[situacao]}
    </span>
  );
}

const iconesModalidade: Record<Modalidade, typeof IconeLocal> = {
  presencial: IconeLocal,
  online: IconeGlobo,
  hibrida: IconeBrilho,
};

export function SeloModalidade({
  modalidade,
  className = "",
}: {
  modalidade: Modalidade;
  className?: string;
}) {
  const Icone = iconesModalidade[modalidade];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-papaya/25 bg-deep/85 px-2.5 py-1 text-[0.68rem] font-semibold text-papaya shadow-sm backdrop-blur-sm ${className}`}
    >
      <Icone className="h-3 w-3 text-steel-300" />
      {ROTULOS_MODALIDADE[modalidade]}
    </span>
  );
}
