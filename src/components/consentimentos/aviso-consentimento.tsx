"use client";

import { useActionState, useState } from "react";
import {
  criarConsentimentoMenor,
  type EstadoConsentimento,
} from "@/lib/consentimentos/acoes";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";
import type { ConsentimentoMenor } from "@/lib/consentimentos/consultas";

/**
 * Aviso do consentimento de menor de idade na área do participante:
 * reenviar o link, trocar o e-mail do responsável e acompanhar a resposta.
 */
export function AvisoConsentimento({
  consentimento,
}: {
  consentimento: ConsentimentoMenor;
}) {
  const [estado, acao, pendente] = useActionState<EstadoConsentimento, FormData>(
    criarConsentimentoMenor,
    null,
  );
  const [trocando, setTrocando] = useState(
    consentimento.status !== "pendente" || consentimento.expirado,
  );
  const [email, setEmail] = useState(consentimento.emailResponsavel ?? "");

  if (consentimento.status === "aceito") return null;

  const pendenteValido =
    consentimento.status === "pendente" && !consentimento.expirado;

  return (
    <section
      aria-labelledby="consentimento-menor"
      className="rounded-2xl border border-brick/30 bg-papaya p-5"
    >
      <h2
        id="consentimento-menor"
        className="font-display text-base font-semibold text-molten"
      >
        {pendenteValido
          ? "Aguardando autorização do responsável"
          : "Cadastro de menor de idade"}
      </h2>

      <p className="mt-1.5 text-sm leading-relaxed text-ink">
        {pendenteValido
          ? `Enviamos um pedido de autorização para ${consentimento.emailResponsavel ?? "o responsável"}. A conta fica limitada até a resposta.`
          : consentimento.expirado
            ? "O link enviado ao responsável expirou. Informe o e-mail para receber um novo."
            : consentimento.status === "recusado"
              ? "O responsável recusou a autorização. Você pode informar outro e-mail para uma nova tentativa."
              : "O responsável revogou a autorização. Informe um e-mail para solicitar de novo."}
      </p>

      <div className="mt-4 space-y-3">
        <AvisoFormulario
          tipo="erro"
          mensagem={estado && !estado.ok ? estado.mensagem : null}
        />
        <AvisoFormulario
          tipo="sucesso"
          mensagem={estado?.ok ? estado.mensagem : null}
        />

        {trocando ? (
          <form action={acao} className="flex flex-col gap-2 sm:flex-row">
            <label
              htmlFor="email-responsavel-aviso"
              className="min-w-0 flex-1 text-xs font-semibold text-deep"
            >
              E-mail do responsável
              <input
                id="email-responsavel-aviso"
                name="email_responsavel"
                type="email"
                required
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-sm text-deep outline-none focus:border-brick focus:ring-4 focus:ring-brick/10"
                placeholder="responsavel@exemplo.com"
              />
            </label>
            <button
              type="submit"
              disabled={pendente}
              className="h-11 shrink-0 self-end rounded-full bg-deep px-4 text-xs font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendente ? "Enviando..." : "Enviar pedido"}
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <form action={acao}>
              <input
                type="hidden"
                name="email_responsavel"
                value={consentimento.emailResponsavel ?? ""}
              />
              <button
                type="submit"
                disabled={pendente}
                className="inline-flex h-10 items-center justify-center rounded-full bg-deep px-4 text-xs font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendente ? "Enviando..." : "Reenviar link"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setTrocando(true)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-deep/20 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
            >
              Usar outro e-mail
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
