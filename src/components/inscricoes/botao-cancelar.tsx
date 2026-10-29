"use client";

import { useActionState } from "react";
import {
  cancelarInscricao,
  type EstadoInscricao,
} from "@/lib/inscricoes/acoes";

export function BotaoCancelarInscricao({
  inscricaoId,
  eventoId,
}: {
  inscricaoId: string;
  eventoId: string;
}) {
  const [estado, formAction, pendente] = useActionState<EstadoInscricao, FormData>(
    cancelarInscricao,
    null,
  );

  return (
    <div className="flex flex-col items-start gap-1.5">
      <form action={formAction}>
        <input type="hidden" name="inscricao_id" value={inscricaoId} />
        <input type="hidden" name="evento_id" value={eventoId} />
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex h-9 items-center justify-center rounded-full border border-brick/40 px-3.5 text-xs font-semibold text-brick transition-colors hover:bg-ember-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendente ? "Cancelando..." : "Cancelar inscrição"}
        </button>
      </form>

      {estado ? (
        <p
          role="status"
          aria-live="polite"
          className={`text-xs leading-relaxed ${
            estado.ok ? "text-steel-700" : "text-brick"
          }`}
        >
          {estado.mensagem}
        </p>
      ) : null}
    </div>
  );
}
