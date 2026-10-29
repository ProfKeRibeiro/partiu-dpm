"use client";

import { excluirEvento } from "@/lib/admin/eventos-acoes";

export function BotaoExcluirEvento({ eventoId }: { eventoId: string }) {
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
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-full border border-ember-300 bg-ember-50 px-3.5 text-xs font-semibold text-molten transition-colors hover:bg-ember-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-molten"
      >
        Excluir evento
      </button>
    </form>
  );
}