"use client";

import { useActionState } from "react";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";
import {
  registrarAutorizacaoImagem,
  type EstadoConsentimento,
} from "@/lib/consentimentos/acoes";

/**
 * Aceite opcional e revogável para usar a foto de perfil no card de
 * participação compartilhado no Instagram. Sem o aceite, o card é gerado com
 * as iniciais (monograma) e nenhuma imagem pessoal é usada.
 */
export function AutorizacaoImagem({ autorizado }: { autorizado: boolean }) {
  const [estado, acao, pendente] = useActionState(
    (_anterior: EstadoConsentimento | null, formData: FormData) =>
      registrarAutorizacaoImagem(formData),
    null,
  );

  return (
    <div className="mt-4 rounded-xl border border-line bg-canvas p-4">
      <p className="text-sm font-semibold text-deep">
        Foto no card de participação
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Autorizo o uso da minha foto de perfil no card gerado para compartilhar
        a inscrição no Instagram. É opcional e pode ser revogado a qualquer
        momento; sem a autorização, o card mostra apenas as iniciais.
      </p>

      <form action={acao} className="mt-3">
        <input type="hidden" name="autoriza" value={autorizado ? "false" : "true"} />
        <button
          type="submit"
          disabled={pendente}
          aria-pressed={autorizado}
          className={
            autorizado
              ? "inline-flex h-10 items-center justify-center rounded-full border border-brick/30 bg-white px-4 text-sm font-semibold text-brick transition-colors hover:bg-ember-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
              : "inline-flex h-10 items-center justify-center rounded-full bg-deep px-4 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {pendente
            ? "Salvando..."
            : autorizado
              ? "Revogar autorização"
              : "Autorizar uso da minha foto"}
        </button>
      </form>

      {estado ? (
        <div className="mt-3">
          <AvisoFormulario
            tipo={estado.ok ? "sucesso" : "erro"}
            mensagem={estado.mensagem}
          />
        </div>
      ) : null}

      <p className="mt-3 text-[0.7rem] leading-relaxed text-muted">
        Situação atual:{" "}
        <strong className="font-semibold text-deep">
          {autorizado ? "autorizado" : "não autorizado"}
        </strong>
        .
      </p>
    </div>
  );
}
