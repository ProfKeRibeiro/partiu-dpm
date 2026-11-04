"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  aceitarTermosAction,
  type EstadoConsentimento,
} from "@/lib/consentimentos/acoes";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";

/** Banner de re-aceite para quem já tem conta e ainda não aceitou a versão atual. */
export function BannerTermos() {
  const [estado, acao, pendente] = useActionState<EstadoConsentimento, FormData>(
    aceitarTermosAction,
    null,
  );

  if (estado?.ok) return null;

  return (
    <section
      aria-labelledby="banner-termos"
      className="rounded-2xl border border-brick/30 bg-papaya p-5"
    >
      <h2
        id="banner-termos"
        className="font-display text-base font-semibold text-molten"
      >
        Atualizamos os Termos e a Política de Privacidade
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink">
        Leia e aceite para continuar. Leva menos de um minuto e não bloqueia
        suas inscrições.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href="/termos"
          className="text-sm font-semibold text-brick underline underline-offset-4 hover:text-molten"
        >
          Termos de Uso
        </Link>
        <span aria-hidden="true" className="text-muted">
          ·
        </span>
        <Link
          href="/privacidade"
          className="text-sm font-semibold text-brick underline underline-offset-4 hover:text-molten"
        >
          Política de Privacidade
        </Link>
      </div>

      <form action={acao} className="mt-4">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex h-11 items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendente ? "Registrando..." : "Aceitar termos"}
        </button>
      </form>

      <div className="mt-3">
        <AvisoFormulario
          tipo="erro"
          mensagem={estado && !estado.ok ? estado.mensagem : null}
        />
      </div>
    </section>
  );
}
