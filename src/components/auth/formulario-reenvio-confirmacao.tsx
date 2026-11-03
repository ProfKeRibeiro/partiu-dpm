"use client";

import Link from "next/link";
import { useActionState } from "react";
import { reenviarConfirmacao, type EstadoAuth } from "@/lib/auth/acoes";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";
import { atributosDeErro, camposDoErro } from "@/components/auth/campos-com-erro";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10";

const rotulo =
  "block text-xs font-semibold uppercase tracking-[0.14em] text-deep";

const link =
  "font-semibold text-brick underline underline-offset-4 transition-colors hover:text-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick";

export function FormularioReenvioConfirmacao() {
  const [estado, formAction, pendente] = useActionState<EstadoAuth, FormData>(
    reenviarConfirmacao,
    null,
  );
  const erros = camposDoErro(estado?.erro);
  const ID_ERRO = "erro-reenvio-confirmacao";

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <AvisoFormulario tipo="erro" mensagem={estado?.erro} id={ID_ERRO} />
      <AvisoFormulario tipo="sucesso" mensagem={estado?.mensagem} />

      <div>
        <label htmlFor="email" className={rotulo}>
          E-mail do cadastro
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          {...atributosDeErro(erros, "email", ID_ERRO)}
          className={campo}
          placeholder="voce@exemplo.com"
        />
      </div>

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendente ? "Enviando..." : "Reenviar confirmação"}
      </button>

      <p className="text-center text-sm text-muted">
        <Link href="/entrar" className={link}>
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
