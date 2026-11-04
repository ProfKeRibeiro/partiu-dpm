"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  cancelarEquipe,
  removerMembroEquipe,
  sairEquipe,
  transferirLiderEquipe,
  type EstadoEquipe,
} from "@/lib/equipes/acoes";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";
import type { EquipeDoParticipante } from "@/lib/equipes/consultas";

const BOTAO =
  "inline-flex h-10 items-center justify-center rounded-full border border-deep/20 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:cursor-not-allowed disabled:opacity-60";
const BOTAO_PERIGO =
  "inline-flex h-10 items-center justify-center rounded-full border border-brick/40 bg-white px-4 text-xs font-semibold text-brick transition-colors hover:bg-ember-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:cursor-not-allowed disabled:opacity-60";

const ROTULOS_STATUS: Record<string, string> = {
  formando: "Formando",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

/** Cartão da equipe na área do participante, com as ações do líder/membro. */
export function CartaoEquipe({
  equipe,
  eventoTitulo,
  eventoId,
}: {
  equipe: EquipeDoParticipante;
  eventoTitulo: string;
  eventoId: string;
}) {
  const [sairEstado, sairAcao, saindo] = useActionState<EstadoEquipe, FormData>(
    sairEquipe,
    null,
  );
  const [cancelarEstado, cancelarAcao, cancelando] = useActionState<
    EstadoEquipe,
    FormData
  >(cancelarEquipe, null);
  const [removerEstado, removerAcao, removendo] = useActionState<
    EstadoEquipe,
    FormData
  >(removerMembroEquipe, null);
  const [transferirEstado, transferirAcao, transferindo] = useActionState<
    EstadoEquipe,
    FormData
  >(transferirLiderEquipe, null);
  const [novoLider, setNovoLider] = useState("");

  const mensagem =
    sairEstado ?? cancelarEstado ?? removerEstado ?? transferirEstado;
  const ocupado = saindo || cancelando || removendo || transferindo;
  const outros = equipe.membros.filter(
    (membro) => membro.participanteId !== equipe.membros[0]?.participanteId,
  );

  return (
    <div className="rounded-2xl border border-deep/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted">
            {eventoTitulo}
          </p>
          <h3 className="mt-1 truncate font-display text-lg font-semibold text-deep">
            {equipe.nome}
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            {equipe.souLider ? "Você é o líder" : "Você é membro"} ·{" "}
            {equipe.membros.length} membro(s)
          </p>
        </div>
        <span className="rounded-full border border-deep/15 bg-canvas px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-deep">
          {ROTULOS_STATUS[equipe.status] ?? equipe.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-3 py-2">
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">
          Código
        </span>
        <span className="font-mono text-sm font-bold tracking-[0.18em] text-deep">
          {equipe.codigo}
        </span>
        <Link
          href={`/equipes/${equipe.codigo}`}
          className="ml-auto text-xs font-semibold text-brick underline underline-offset-4 hover:text-molten"
        >
          Página da equipe
        </Link>
      </div>

      <ul className="mt-3 space-y-1.5">
        {equipe.membros.map((membro) => (
          <li
            key={membro.participanteId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink"
          >
            <span className="min-w-0 truncate">
              {membro.nome}
              {membro.papel === "lider" ? (
                <span className="ml-2 rounded-full border border-brick/25 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-molten">
                  Líder
                </span>
              ) : null}
            </span>

            {equipe.souLider &&
            membro.participanteId !==
              equipe.membros.find((item) => item.papel === "lider")
                ?.participanteId ? (
              <form action={removerAcao}>
                <input type="hidden" name="equipe_id" value={equipe.id} />
                <input
                  type="hidden"
                  name="participante_id"
                  value={membro.participanteId}
                />
                <button type="submit" disabled={ocupado} className={BOTAO}>
                  Remover
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>

      {equipe.souLider && outros.length > 0 ? (
        <form action={transferirAcao} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="equipe_id" value={equipe.id} />
          <label className="min-w-0 flex-1 text-xs font-semibold text-deep">
            Transferir liderança
            <select
              name="novo_lider_id"
              required
              value={novoLider}
              onChange={(evento) => setNovoLider(evento.target.value)}
              className="mt-1 w-full rounded-xl border border-deep/15 bg-white px-3 py-2 text-sm text-deep outline-none focus:border-brick focus:ring-4 focus:ring-brick/10"
            >
              <option value="">Escolha um membro</option>
              {equipe.membros
                .filter((membro) => membro.papel !== "lider")
                .map((membro) => (
                  <option
                    key={membro.participanteId}
                    value={membro.participanteId}
                  >
                    {membro.nome}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" disabled={ocupado || !novoLider} className={BOTAO}>
            Transferir
          </button>
        </form>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        <form action={sairAcao}>
          <input type="hidden" name="equipe_id" value={equipe.id} />
          <button type="submit" disabled={ocupado} className={BOTAO}>
            {saindo ? "Saindo..." : "Sair da equipe"}
          </button>
        </form>

        {equipe.souLider ? (
          <form action={cancelarAcao}>
            <input type="hidden" name="equipe_id" value={equipe.id} />
            <button type="submit" disabled={ocupado} className={BOTAO_PERIGO}>
              {cancelando ? "Cancelando..." : "Cancelar equipe"}
            </button>
          </form>
        ) : null}

        <Link
          href={`/eventos/${eventoId}`}
          className={`${BOTAO} border-transparent bg-transparent underline underline-offset-4`}
        >
          Ver evento
        </Link>
      </div>

      <div className="mt-3">
        <AvisoFormulario
          tipo="erro"
          mensagem={mensagem && !mensagem.ok ? mensagem.mensagem : null}
        />
        <AvisoFormulario
          tipo="sucesso"
          mensagem={mensagem?.ok ? mensagem.mensagem : null}
        />
      </div>
    </div>
  );
}
