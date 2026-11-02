"use client";

import { useActionState } from "react";
import { redefinirSenha, type EstadoAuth } from "@/lib/auth/acoes";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10";

const rotulo =
  "block text-xs font-semibold uppercase tracking-[0.14em] text-deep";

export function FormularioNovaSenha() {
  const [estado, formAction, pendente] = useActionState<EstadoAuth, FormData>(
    redefinirSenha,
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

      <div>
        <label htmlFor="senha" className={rotulo}>
          Nova senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={campo}
          placeholder="Mínimo de 8 caracteres"
        />
      </div>

      <div>
        <label htmlFor="confirmacao" className={rotulo}>
          Repita a nova senha
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={campo}
          placeholder="Repita para confirmar"
        />
      </div>

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
