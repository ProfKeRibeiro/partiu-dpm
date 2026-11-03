"use client";

import { useActionState } from "react";
import { alterarSenha, type EstadoAuth } from "@/lib/auth/acoes";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";
import { atributosDeErro, camposDoErro } from "@/components/auth/campos-com-erro";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10";

const rotulo = "block text-xs font-semibold uppercase tracking-[0.14em] text-deep";

export function FormularioSenha() {
  const [estado, formAction, pendente] = useActionState<EstadoAuth, FormData>(
    alterarSenha,
    null,
  );
  const erros = camposDoErro(estado?.erro);
  const ID_ERRO = "erro-alterar-senha";

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <AvisoFormulario tipo="erro" mensagem={estado?.erro} id={ID_ERRO} />
      <AvisoFormulario tipo="sucesso" mensagem={estado?.mensagem} />

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
          {...atributosDeErro(erros, "senha", ID_ERRO, "ajuda-senha")}
          className={campo}
          placeholder="Mínimo de 8 caracteres"
        />
        <p id="ajuda-senha" className="mt-1.5 text-xs text-muted">
          Use pelo menos 8 caracteres.
        </p>
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
          {...atributosDeErro(erros, "confirmacao", ID_ERRO)}
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
