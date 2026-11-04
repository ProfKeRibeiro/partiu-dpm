"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  criarSorteio,
  realizarSorteio,
  type EstadoSorteio,
} from "@/lib/sorteios/acoes";
import type {
  ParticipanteSorteioAdmin,
  SorteioDoEvento,
} from "@/lib/sorteios/consultas";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";
import { IconeCopiar } from "@/components/ui/icons";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-sm text-deep outline-none transition focus:border-brick focus:ring-4 focus:ring-brick/10";
const rotulo = "block text-sm font-semibold text-deep";

const ROTULOS_STATUS: Record<string, string> = {
  aberto: "Aberto",
  realizado: "Realizado",
  cancelado: "Cancelado",
  rascunho: "Rascunho",
};

/** Seção "Sorteio" do painel do evento. */
export function SorteioDoEvento({
  eventoId,
  sorteio,
  participantes,
  vencedores,
}: {
  eventoId: string;
  sorteio: SorteioDoEvento | null;
  participantes: ParticipanteSorteioAdmin[];
  vencedores: string[];
}) {
  const [criarEstado, criarAcao, criando] = useActionState<
    EstadoSorteio,
    FormData
  >(criarSorteio, null);
  const [drawEstado, drawAcao, sorteando] = useActionState<
    EstadoSorteio,
    FormData
  >(realizarSorteio, null);
  const [confirmando, setConfirmando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | null>(null);

  const elegiveis = participantes.filter((item) => item.elegivel).length;
  const pendentes = participantes.filter(
    (item) => !item.elegivel && item.consentimentoStatus === "pendente",
  ).length;
  const inelegiveis = participantes.length - elegiveis - pendentes;

  async function copiar() {
    if (!sorteio) return;

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/sorteios/${sorteio.id}`,
      );
      setCopiado(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopiado(false), 5000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-deep/10 bg-white p-5 shadow-suave sm:p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight text-deep">
        Sorteio
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Cadastro público de visitantes com sorteio auditável. O resultado usa
        uma semente pública e a ordem dos inscritos elegíveis.
      </p>

      {!sorteio ? (
        <form
          action={criarAcao}
          className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end"
        >
          <input type="hidden" name="evento_id" value={eventoId} />
          <label>
            <span className={rotulo}>Nome do sorteio *</span>
            <input
              name="nome"
              required
              minLength={3}
              maxLength={120}
              className={campo}
              placeholder="Ex.: Sorteio de brindes FETEC"
            />
          </label>
          <label>
            <span className={rotulo}>Vencedores *</span>
            <input
              type="number"
              name="quantidade_vencedores"
              required
              min={1}
              max={100}
              step={1}
              defaultValue={1}
              className={campo}
            />
          </label>
          <button
            type="submit"
            disabled={criando}
            className="inline-flex h-11 items-center justify-center rounded-full bg-deep px-4 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {criando ? "Criando..." : "Criar sorteio"}
          </button>
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold text-deep">
                {sorteio.nome}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {sorteio.quantidadeVencedores} vencedor(es) ·{" "}
                {participantes.length} inscrito(s)
              </p>
            </div>
            <span className="rounded-full border border-deep/15 bg-canvas px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-deep">
              {ROTULOS_STATUS[sorteio.status] ?? sorteio.status}
            </span>
          </div>

          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
            <span className="text-deep">{elegiveis} elegível(is)</span>
            <span className="text-muted">{pendentes} aguardando responsável</span>
            <span className="text-muted">{inelegiveis} inelegível(is)</span>
          </p>

          {participantes.length > 0 ? (
            <details className="group rounded-xl border border-line bg-canvas/60 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick">
                Ver participantes
              </summary>
              <ul className="mt-2 divide-y divide-line">
                {participantes.map((participante) => (
                  <li
                    key={participante.participanteId}
                    className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs"
                  >
                    <span className="min-w-0 truncate font-medium text-ink">
                      {participante.nome || "Participante"}
                      {participante.vencedor ? (
                        <span className="ml-2 rounded-full border border-brick/25 bg-papaya px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-molten">
                          Vencedor
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-semibold ${
                        participante.elegivel
                          ? "border-steel-300 bg-steel-50 text-deep"
                          : participante.consentimentoStatus === "pendente"
                            ? "border-line bg-white text-muted"
                            : "border-ember-300 bg-ember-50 text-molten"
                      }`}
                    >
                      {participante.elegivel
                        ? "Elegível"
                        : participante.consentimentoStatus === "pendente"
                          ? "Aguardando responsável"
                          : "Inelegível"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="rounded-xl border border-line bg-shell px-4 py-3 text-sm text-muted">
              Nenhum participante cadastrado ainda. Compartilhe o link ou o QR
              do sorteio.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/sorteios/${sorteio.id}`}
              className="inline-flex h-10 items-center rounded-full border border-deep/20 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Abrir página do sorteio
            </Link>
            <button
              type="button"
              onClick={copiar}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-deep/20 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              <IconeCopiar className="h-3.5 w-3.5" />
              Copiar link
            </button>
          </div>

          {sorteio.status === "aberto" ? (
            <div className="rounded-xl border border-brick/30 bg-papaya p-4">
              {confirmando ? (
                <form
                  action={drawAcao}
                  className="space-y-3"
                  onSubmit={() => setConfirmando(false)}
                >
                  <input type="hidden" name="sorteio_id" value={sorteio.id} />
                  <p className="text-sm font-semibold text-molten">
                    Confirmar o sorteio agora?
                  </p>
                  <p className="text-xs leading-relaxed text-ink">
                    Esta ação é irreversível: os {sorteio.quantidadeVencedores}{" "}
                    vencedores são definidos e o sorteio não aceita mais
                    cadastros. {elegiveis} participante(s) elegível(is).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      ref={confirmarRef}
                      type="submit"
                      disabled={sorteando || elegiveis === 0}
                      className="inline-flex h-10 items-center rounded-full bg-brick px-4 text-xs font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sorteando ? "Sorteando..." : "Sim, realizar sorteio"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(false)}
                      className="inline-flex h-10 items-center rounded-full border border-deep/20 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs leading-relaxed text-ink">
                    Quando estiver pronto, realize o sorteio. Depois disso não é
                    possível voltar atrás.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmando(true);
                      window.requestAnimationFrame(() =>
                        confirmarRef.current?.focus(),
                      );
                    }}
                    disabled={elegiveis === 0}
                    className="inline-flex h-10 items-center rounded-full bg-brick px-4 text-xs font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Realizar sorteio
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {sorteio.status === "realizado" ? (
            <div className="rounded-xl border border-steel-300 bg-steel-50 p-4">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">
                Vencedores
              </p>
              {vencedores.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {vencedores.map((nome, indice) => (
                    <li
                      key={`${nome}-${indice}`}
                      className="text-sm font-semibold text-deep"
                    >
                      {indice + 1}. {nome}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Consulte a página pública para ver o resultado.
                </p>
              )}
              {sorteio.semente ? (
                <p className="mt-3 break-all text-xs text-muted">
                  Semente:{" "}
                  <span className="font-mono text-deep">
                    {sorteio.semente}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-4 space-y-1">
        <AvisoFormulario
          tipo="erro"
          mensagem={criarEstado && !criarEstado.ok ? criarEstado.mensagem : null}
        />
        <AvisoFormulario
          tipo="sucesso"
          mensagem={criarEstado?.ok ? criarEstado.mensagem : null}
        />
        <AvisoFormulario
          tipo="erro"
          mensagem={drawEstado && !drawEstado.ok ? drawEstado.mensagem : null}
        />
        <AvisoFormulario
          tipo="sucesso"
          mensagem={drawEstado?.ok ? drawEstado.mensagem : null}
        />
      </div>

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={copiado ? "mt-2 text-xs font-medium text-deep" : "sr-only"}
      >
        {copiado ? "Link copiado!" : ""}
      </p>
    </section>
  );
}
