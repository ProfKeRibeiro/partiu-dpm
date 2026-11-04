"use client";

import { useActionState, useRef, useState } from "react";
import {
  campanhaReaceiteTermos,
  type EstadoConsentimento,
} from "@/lib/consentimentos/acoes";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";

/**
 * Bloco "Termos de uso" do painel: dispara a campanha de re-aceite.
 *
 * A action só é chamada no clique (não há contagem prévia sem rodar a RPC de
 * campanha) e é idempotente: quem já recebeu o lembrete desta versão não
 * recebe de novo.
 */
export function CampanhaTermos() {
  const [estado, acao, pendente] = useActionState<EstadoConsentimento, FormData>(
    campanhaReaceiteTermos,
    null,
  );
  const [confirmando, setConfirmando] = useState(false);
  const confirmarRef = useRef<HTMLButtonElement>(null);

  return (
    <section className="mt-8 rounded-2xl border border-deep/10 bg-white p-5 shadow-suave sm:p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight text-deep">
        Termos de uso
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Envia um lembrete por e-mail para quem ainda não aceitou a versão
        vigente dos Termos de Uso e da Política de Privacidade. É idempotente:
        rodar de novo não duplica o aviso para quem já recebeu.
      </p>

      <form
        action={acao}
        className="mt-4"
        onSubmit={() => setConfirmando(false)}
      >
        {confirmando ? (
          <div className="rounded-xl border border-brick/30 bg-papaya p-4">
            <p className="text-sm font-semibold text-molten">
              Enviar o lembrete agora?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink">
              O e-mail vai para todos os usuários pendentes desta versão. Quem
              já recebeu não recebe de novo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                ref={confirmarRef}
                type="submit"
                disabled={pendente}
                className="inline-flex h-10 items-center justify-center rounded-full bg-brick px-4 text-xs font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendente ? "Enviando..." : "Sim, enviar lembrete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-deep/20 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs leading-relaxed text-muted">
              O botão pede confirmação antes de disparar os e-mails.
            </p>
            <button
              type="button"
              onClick={() => {
                setConfirmando(true);
                window.requestAnimationFrame(() =>
                  confirmarRef.current?.focus(),
                );
              }}
              className="inline-flex h-10 items-center justify-center rounded-full bg-deep px-4 text-xs font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
            >
              Enviar lembrete de aceite
            </button>
          </div>
        )}
      </form>

      <div className="mt-3 space-y-1">
        <AvisoFormulario
          tipo="erro"
          mensagem={estado && !estado.ok ? estado.mensagem : null}
        />
        <AvisoFormulario
          tipo="sucesso"
          mensagem={estado?.ok ? estado.mensagem : null}
        />
      </div>
    </section>
  );
}
