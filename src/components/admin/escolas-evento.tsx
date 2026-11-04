"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  criarInscricaoEscola,
  type EstadoEscola,
} from "@/lib/escolas/acoes";
import type { EscolaInscricaoAdmin } from "@/lib/escolas/consultas";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";
import { IconeCopiar } from "@/components/ui/icons";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-sm text-deep outline-none transition focus:border-brick focus:ring-4 focus:ring-brick/10";
const rotulo = "block text-sm font-semibold text-deep";

const ROTULOS_ALUNO: Record<string, string> = {
  autorizado: "Autorizado",
  pendente: "Pendente",
  recusado: "Recusado",
};

/** Seção "Escolas (FETEC)" do painel do evento. */
export function EscolasDoEvento({
  eventoId,
  escolas,
  podeInscrever,
}: {
  eventoId: string;
  escolas: EscolaInscricaoAdmin[];
  podeInscrever: boolean;
}) {
  const [estado, acao, pendente] = useActionState<EstadoEscola, FormData>(
    criarInscricaoEscola,
    null,
  );
  const [copiado, setCopiado] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  async function copiar(codigo: string) {
    const url = `${window.location.origin}/escolas/${codigo}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiado(codigo);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopiado(null), 5000);
    } catch {
      setCopiado(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-deep/10 bg-white p-5 shadow-suave sm:p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight text-deep">
        Escolas (FETEC)
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Professores e coordenadores inscrevem a escola e recebem um código. Os
        alunos usam esse código para se inscrever, com autorização do
        responsável.
      </p>

      {podeInscrever ? (
        <form action={acao} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="evento_id" value={eventoId} />
          <label>
            <span className={rotulo}>Nome da escola *</span>
            <input
              name="escola_nome"
              required
              minLength={3}
              maxLength={120}
              className={campo}
              placeholder="Ex.: ETEC Darcy Pereira de Moraes"
            />
          </label>
          <label>
            <span className={rotulo}>Responsável *</span>
            <input
              name="responsavel_nome"
              required
              minLength={3}
              maxLength={80}
              className={campo}
              placeholder="Quem acompanha a escola"
            />
          </label>
          <button
            type="submit"
            disabled={pendente}
            className="inline-flex h-11 items-center justify-center rounded-full bg-deep px-4 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendente ? "Inscrevendo..." : "Inscrever escola"}
          </button>
        </form>
      ) : (
        <p className="mt-4 rounded-xl border border-line bg-shell px-4 py-3 text-sm leading-relaxed text-muted">
          Apenas professores e coordenadores com e-mail{" "}
          <span className="font-semibold text-deep">@cps.sp.gov.br</span> podem
          inscrever escolas. Peça a um deles para criar a inscrição.
        </p>
      )}

      <div className="mt-4">
        <AvisoFormulario
          tipo="erro"
          mensagem={estado && !estado.ok ? estado.mensagem : null}
        />
        <AvisoFormulario
          tipo="sucesso"
          mensagem={
            estado?.ok
              ? `${estado.mensagem} Código: ${estado.codigo ?? ""}`
              : null
          }
        />
      </div>

      {escolas.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-shell px-4 py-3 text-sm text-muted">
          Nenhuma escola inscrita neste evento até agora.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {escolas.map((escola) => {
            const recusados = escola.alunos.filter(
              (aluno) => aluno.status === "recusado",
            ).length;

            return (
              <li
                key={escola.escolaId}
                className="rounded-xl border border-line bg-canvas/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-deep">
                      {escola.escolaNome}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      Responsável: {escola.responsavelNome}
                      {escola.responsavelEmail
                        ? ` · ${escola.responsavelEmail}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-deep/15 bg-white px-2.5 py-1 font-mono text-xs font-bold tracking-[0.14em] text-deep">
                      {escola.codigo}
                    </span>
                    <button
                      type="button"
                      onClick={() => copiar(escola.codigo)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-deep/20 bg-white px-3 text-[0.7rem] font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    >
                      <IconeCopiar className="h-3.5 w-3.5" />
                      Copiar
                    </button>
                    <Link
                      href={`/escolas/${escola.codigo}`}
                      className="text-xs font-semibold text-brick underline underline-offset-4 hover:text-molten"
                    >
                      Abrir
                    </Link>
                  </div>
                </div>

                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
                  <span className="text-deep">
                    {escola.autorizados} autorizado(s)
                  </span>
                  <span className="text-muted">
                    {escola.pendentes} pendente(s)
                  </span>
                  <span className="text-muted">{recusados} recusado(s)</span>
                </p>

                {escola.alunos.length > 0 ? (
                  <details className="group mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-deep underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick">
                      Ver {escola.alunos.length} aluno(s)
                    </summary>
                    <ul className="mt-2 divide-y divide-line">
                      {escola.alunos.map((aluno, indice) => (
                        <li
                          key={`${aluno.email}-${indice}`}
                          className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {aluno.nome || "Aluno"}
                            </span>
                            <span className="truncate text-muted">
                              {aluno.email}
                            </span>
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 font-semibold ${
                              aluno.status === "autorizado"
                                ? "border-steel-300 bg-steel-50 text-deep"
                                : aluno.status === "recusado"
                                  ? "border-ember-300 bg-ember-50 text-molten"
                                  : "border-line bg-white text-muted"
                            }`}
                          >
                            {ROTULOS_ALUNO[aluno.status]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          copiado ? "mt-3 text-xs font-medium text-deep" : "sr-only"
        }
      >
        {copiado ? "Link copiado!" : ""}
      </p>
    </section>
  );
}
