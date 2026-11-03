"use client";

import { IconeLixeira } from "@/components/ui/icons";
import { excluirEvento } from "@/lib/admin/eventos-acoes";

/**
 * Exclusão de evento com confirmação. A variante `icone` é usada na lista do
 * painel; a `texto` continua na página do evento.
 */
export function BotaoExcluirEvento({
  eventoId,
  variante = "texto",
}: {
  eventoId: string;
  variante?: "texto" | "icone";
}) {
  return (
    <form
      action={excluirEvento}
      onSubmit={(event) => {
        const confirmado = window.confirm(
          "Excluir este evento? Inscrições, presenças e certificados associados também serão removidos. Esta ação não pode ser desfeita.",
        );

        if (!confirmado) event.preventDefault();
      }}
    >
      <input type="hidden" name="evento_id" value={eventoId} />

      {variante === "icone" ? (
        <button
          type="submit"
          aria-label="Excluir evento"
          title="Excluir evento"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-brick/30 bg-white text-brick transition-colors hover:border-brick/60 hover:bg-ember-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
        >
          <IconeLixeira className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-full border border-ember-300 bg-ember-50 px-3.5 text-xs font-semibold text-molten transition-colors hover:bg-ember-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-molten"
        >
          Excluir evento
        </button>
      )}
    </form>
  );
}
