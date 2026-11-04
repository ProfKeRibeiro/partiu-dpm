"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { criarEquipe, type EstadoEquipe } from "@/lib/equipes/acoes";
import {
  MENSAGEM_ORIENTADOR,
  emailEhDeAluno,
  emailOrientadorValido,
} from "@/lib/equipes/validacao";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";
import { IconeCopiar, IconeCheck } from "@/components/ui/icons";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10";
const rotulo =
  "block text-xs font-semibold uppercase tracking-[0.14em] text-deep";

/** Formulário de criação de equipe, com o código e o link no fim. */
export function FormularioCriarEquipe({
  eventoId,
  exigeOrientador,
  className = "",
}: {
  eventoId: string;
  exigeOrientador: boolean;
  className?: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoEquipe, FormData>(
    criarEquipe,
    null,
  );
  const [copiado, setCopiado] = useState(false);
  const [emailOrientador, setEmailOrientador] = useState("");
  const [erroEmail, setErroEmail] = useState("");
  const timerRef = useRef<number | null>(null);

  const codigo = estado?.ok ? estado.codigo : null;
  const link = codigo ? `/equipes/${codigo}` : null;

  async function copiar() {
    if (!link) return;

    const url = `${window.location.origin}${link}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopiado(false), 5000);
    } catch {
      setCopiado(false);
    }
  }

  if (codigo && link) {
    return (
      <div className={className}>
        <p className="inline-flex items-center gap-2 rounded-xl border border-steel-300 bg-steel-50 px-4 py-3 text-sm font-medium text-deep">
          <IconeCheck className="h-4 w-4 text-steel-700" />
          Equipe criada! Compartilhe o código com seus colegas.
        </p>

        <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
          Código da equipe
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-[0.18em] text-deep">
          {codigo}
        </p>

        <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
          Link público
        </p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 break-all rounded-xl border border-deep/10 bg-canvas px-3 py-2 text-xs text-ink">
            {link}
          </code>
          <button
            type="button"
            onClick={copiar}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-deep/20 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
          >
            <IconeCopiar className="h-4 w-4" />
            Copiar link
          </button>
        </div>

        <p
          role="status"
          aria-live="polite"
          className={
            copiado ? "mt-2 text-xs font-medium text-deep" : "sr-only"
          }
        >
          {copiado ? "Link copiado!" : ""}
        </p>

        <Link
          href={link}
          className="mt-5 inline-flex text-sm font-semibold text-brick underline underline-offset-4 hover:text-molten"
        >
          Ver a página da equipe
        </Link>
      </div>
    );
  }

  return (
    <form
      action={acao}
      className={`space-y-4 ${className}`}
      onSubmit={(evento) => {
        if (!exigeOrientador) return;

        if (!emailOrientadorValido(emailOrientador)) {
          evento.preventDefault();
          setErroEmail(MENSAGEM_ORIENTADOR);
        }
      }}
    >
      <input type="hidden" name="evento_id" value={eventoId} />

      <AvisoFormulario
        tipo="erro"
        mensagem={estado && !estado.ok ? estado.mensagem : null}
      />
      <AvisoFormulario
        tipo="sucesso"
        mensagem={estado?.ok ? estado.mensagem : null}
      />

      <div>
        <label htmlFor="nome-equipe" className={rotulo}>
          Nome da equipe
        </label>
        <input
          id="nome-equipe"
          name="nome"
          type="text"
          required
          minLength={3}
          maxLength={80}
          className={campo}
          placeholder="Ex.: Byte Squad"
          aria-describedby="ajuda-nome-equipe"
        />
        <p id="ajuda-nome-equipe" className="mt-1.5 text-xs text-muted">
          Entre 3 e 80 caracteres. Aparece na página pública e no painel.
        </p>
      </div>

      {exigeOrientador ? (
        <>
          <div>
            <label htmlFor="orientador-nome" className={rotulo}>
              Nome do orientador
            </label>
            <input
              id="orientador-nome"
              name="orientador_nome"
              type="text"
              required
              maxLength={120}
              className={campo}
              placeholder="Ex.: Prof. Daniela Silva"
            />
          </div>

          <div>
            <label htmlFor="orientador-email" className={rotulo}>
              E-mail institucional do orientador
            </label>
            <input
              id="orientador-email"
              name="orientador_email"
              type="email"
              required
              maxLength={160}
              value={emailOrientador}
              onChange={(evento) => {
                setEmailOrientador(evento.target.value);
                setErroEmail("");
              }}
              autoComplete="off"
              placeholder="professor@cps.sp.gov.br"
              aria-invalid={erroEmail ? true : undefined}
              aria-describedby="ajuda-orientador-email"
              className={campo}
            />
            {erroEmail ? (
              <p
                role="alert"
                className="mt-1.5 text-xs font-medium text-molten"
              >
                {erroEmail}
              </p>
            ) : null}
            <p
              id="ajuda-orientador-email"
              className="mt-1.5 text-xs leading-relaxed text-muted"
            >
              {emailEhDeAluno(emailOrientador)
                ? "Este é um e-mail de aluno. Peça ao professor o e-mail institucional dele."
                : "Precisa ser o e-mail de professor (@cps.sp.gov.br). E-mails @aluno.cps.sp.gov.br não valem."}
            </p>
          </div>
        </>
      ) : null}

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendente ? "Criando equipe..." : "Criar equipe"}
      </button>
    </form>
  );
}
