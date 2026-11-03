"use client";

import { useEffect, useRef } from "react";

const ESTILO_ERRO =
  "rounded-xl border border-ember-400/40 bg-ember-50 px-4 py-3 text-sm text-molten outline-none focus-visible:ring-4 focus-visible:ring-brick/20";
const ESTILO_SUCESSO =
  "rounded-xl border border-steel-300 bg-steel-50 px-4 py-3 text-sm leading-relaxed text-deep";

/**
 * Bloco de retorno de formulário.
 *
 * A mensagem de erro recebe o foco assim que aparece, para que o leitor de tela
 * anuncie o problema sem que a pessoa precise procurá-lo no topo do formulário.
 * As duas regiões vivas ficam montadas desde o primeiro render (mesmo vazias):
 * uma região criada já com texto não é anunciada por NVDA e JAWS.
 *
 * Renderize as duas variantes sempre, com `mensagem={estado?.erro}` e
 * `mensagem={estado?.mensagem}`.
 */
export function AvisoFormulario({
  tipo,
  mensagem,
  id,
  className = "",
}: {
  tipo: "erro" | "sucesso";
  mensagem?: string | null;
  id?: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const erro = tipo === "erro";
  const texto = mensagem?.trim() ?? "";

  useEffect(() => {
    if (erro && texto) ref.current?.focus({ preventScroll: true });
  }, [erro, texto]);

  if (erro) {
    return (
      <p
        ref={ref}
        id={id}
        tabIndex={-1}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={texto ? `${ESTILO_ERRO} ${className}`.trim() : "sr-only"}
      >
        {texto}
      </p>
    );
  }

  return (
    <p
      id={id}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={texto ? `${ESTILO_SUCESSO} ${className}`.trim() : "sr-only"}
    >
      {texto}
    </p>
  );
}
