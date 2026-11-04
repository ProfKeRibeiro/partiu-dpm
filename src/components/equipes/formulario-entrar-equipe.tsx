"use client";

import { useActionState } from "react";
import { entrarEquipe, type EstadoEquipe } from "@/lib/equipes/acoes";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";

/** Botão "Entrar nesta equipe" (o código vai em campo oculto). */
export function FormularioEntrarEquipe({
  codigo,
  rotulo = "Entrar nesta equipe",
  className = "",
}: {
  codigo: string;
  rotulo?: string;
  className?: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoEquipe, FormData>(
    entrarEquipe,
    null,
  );

  return (
    <form action={acao} className={`space-y-3 ${className}`}>
      <input type="hidden" name="codigo" value={codigo} />

      <AvisoFormulario
        tipo="erro"
        mensagem={estado && !estado.ok ? estado.mensagem : null}
      />
      <AvisoFormulario
        tipo="sucesso"
        mensagem={estado?.ok ? estado.mensagem : null}
      />

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendente ? "Entrando..." : rotulo}
      </button>
    </form>
  );
}
