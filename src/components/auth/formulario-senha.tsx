"use client";

import { useActionState } from "react";
import { alterarSenha, type EstadoAuth } from "@/lib/auth/acoes";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10";

const rotulo = "block text-xs font-semibold uppercase tracking-[0.14em] text-deep";

export function FormularioSenha() {
  const [estado, formAction, pendente] = useActionState<EstadoAuth, FormData>(
    alterarSenha,
    null,
  );

  return (
    <form action={formAction} className="mt-4 space-y-4">
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
          className="rounded-xl border border-steel-300 bg-steel-50 px-4 py-3 text-sm text-deep"
        >
          {estado.mensagem}
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
          required
          minLength={8}
          autoComplete="new-password"
          className={campo}
          placeholder="Mínimo de 8 caracteres"
        />
      </div>

      <div>
        <label htmlFor="confirmacao" className={rotulo}>
          Confirme a nova senha
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={campo}
          placeholder="Repita a nova senha"
        />
      </div>

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex h-10 items-center justify-center rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep transition-colors hover:border-deep/35 hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendente ? "Alterando..." : "Alterar senha"}
      </button>
    </form>
  );
}
