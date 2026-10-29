"use client";

import { IconeCertificado } from "@/components/ui/icons";

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-deep px-4 text-xs font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      <IconeCertificado className="h-4 w-4" />
      Imprimir / salvar PDF
    </button>
  );
}
