"use client";

import Link from "next/link";
import { useActionState } from "react";
import { solicitarRecuperacao, type EstadoAuth } from "@/lib/auth/acoes";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10";

const rotulo =
  "block text-xs font-semibold uppercase tracking-[0.14em] text-deep";

export function FormularioRecuperacao() {
  const [estado, formAction, pendente] = useActionState<EstadoAuth, FormData>(
    solicitarRecuperacao,
    null,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {estado?.erro ? (
        <p
          role="alert"
          className="rounded-xl border border-ember-400/40 bg-ember-50 px-4 py-3 text-sm text-molten"
        >
          {estado.erro}
        </p>
      ) : null}

      {estado?.mensagem ? (
        <p
          role="status"
          className="rounded-xl border border-steel-300 bg-steel-50 px-4 py-3 text-sm leading-relaxed text-deep"
        >
          {estado.mensagem}
        </p>
      ) : null}

      <div>
        <label htmlFor="email" className={rotulo}>
          E-mail da conta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={campo}
          placeholder="voce@exemplo.com"
        />
      </div>

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendente ? "Enviando..." : "Enviar link de recuperação"}
      </button>

      <p className="text-center text-sm text-muted">
        Lembrou a senha?{" "}
        <Link
          href="/entrar"
          className="font-semibold text-brick underline underline-offset-4 transition-colors hover:text-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
        >
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
