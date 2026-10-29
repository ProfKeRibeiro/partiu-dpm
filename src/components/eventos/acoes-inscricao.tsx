"use client";

import Link from "next/link";
import { useActionState } from "react";
import { IconeCheck, IconeSetaDiagonal } from "@/components/ui/icons";
import {
  cancelarInscricao,
  inscreverEmEvento,
  type EstadoInscricao,
} from "@/lib/inscricoes/acoes";

type StatusInscricao = "confirmada" | "cancelada" | "lista_espera";

export function AcoesInscricao({
  eventoId,
  situacao,
  autenticado,
  inscricao,
  linkAcesso,
  eventoIniciado,
  destinoLogin,
}: {
  eventoId: string;
  situacao: "aberta" | "em-breve" | "encerrada" | "lotado";
  autenticado: boolean;
  inscricao: { id: string; status: StatusInscricao } | null;
  linkAcesso: string | null;
  eventoIniciado: boolean;
  destinoLogin: string;
}) {
  const [estadoInscricao, acaoInscrever, inscrevendo] = useActionState<
    EstadoInscricao,
    FormData
  >(inscreverEmEvento, null);
  const [estadoCancelamento, acaoCancelar, cancelando] = useActionState<
    EstadoInscricao,
    FormData
  >(cancelarInscricao, null);

  const confirmada = inscricao?.status === "confirmada";
  const mensagem = estadoInscricao ?? estadoCancelamento;

  if (!autenticado) {
    if (situacao !== "aberta") return null;

    return (
      <div>
        <Link
          href={`/entrar?next=${encodeURIComponent(destinoLogin)}`}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Entrar para se inscrever
          <IconeSetaDiagonal className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-center text-xs leading-relaxed text-muted">
          A inscrição exige uma conta no Partiu DPM.
        </p>
      </div>
    );
  }

  if (confirmada && inscricao) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-deep/15 bg-papaya px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-deep">
            <IconeCheck className="h-4 w-4 text-brick" />
            Inscrição confirmada
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink">
            {eventoIniciado
              ? "Este evento já começou. Bom proveito!"
              : "Guarde este comprovante. Você pode cancelar até o início do evento."}
          </p>
        </div>

        {linkAcesso ? (
          <a
            href={linkAcesso}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep transition-colors hover:border-deep/35 hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Acessar link do evento
            <IconeSetaDiagonal className="h-4 w-4" />
          </a>
        ) : null}

        {!eventoIniciado ? (
          <form action={acaoCancelar}>
            <input type="hidden" name="inscricao_id" value={inscricao.id} />
            <input type="hidden" name="evento_id" value={eventoId} />
            <button
              type="submit"
              disabled={cancelando}
              className="inline-flex h-10 w-full items-center justify-center rounded-full border border-brick/40 px-4 text-xs font-semibold text-brick transition-colors hover:bg-ember-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelando ? "Cancelando..." : "Cancelar inscrição"}
            </button>
          </form>
        ) : null}

        {mensagem ? (
          <p
            role="status"
            aria-live="polite"
            className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
              mensagem.ok
                ? "bg-steel-50 text-deep"
                : "bg-ember-50 text-molten"
            }`}
          >
            {mensagem.mensagem}
          </p>
        ) : null}
      </div>
    );
  }

  if (inscricao?.status === "lista_espera") {
    return (
      <div className="rounded-xl border border-brick/30 bg-papaya px-4 py-3 text-sm leading-relaxed text-molten">
        Você está na lista de espera deste evento. A organização avisará se uma
        vaga for liberada.
      </div>
    );
  }

  if (situacao !== "aberta") return null;

  return (
    <div>
      <form action={acaoInscrever}>
        <input type="hidden" name="evento_id" value={eventoId} />
        <button
          type="submit"
          disabled={inscrevendo}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
        >
          {inscrevendo ? "Confirmando..." : "Confirmar inscrição"}
          <IconeCheck className="h-4 w-4" />
        </button>
      </form>

      {inscricao?.status === "cancelada" ? (
        <p className="mt-2 text-center text-xs text-muted">
          Sua inscrição anterior foi cancelada. Você pode se inscrever novamente.
        </p>
      ) : null}

      {mensagem ? (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed ${
            mensagem.ok ? "bg-steel-50 text-deep" : "bg-ember-50 text-molten"
          }`}
        >
          {mensagem.mensagem}
        </p>
      ) : null}
    </div>
  );
}
