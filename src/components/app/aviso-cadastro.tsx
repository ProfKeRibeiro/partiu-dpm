"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppContainer } from "@/components/app/container";
import { IconePessoa, IconeSetaDireita } from "@/components/ui/icons";
import { frasePendencias } from "@/lib/auth/perfil-pendencias";

/**
 * Aviso exibido na área do participante enquanto o cadastro estiver
 * incompleto. Aparece logo depois do login e leva direto ao perfil; fica
 * oculto na própria página de perfil, onde o formulário já está à vista.
 */
export function AvisoCadastro({ pendencias }: { pendencias: string[] }) {
  const pathname = usePathname();

  if (pendencias.length === 0 || pathname === "/conta/perfil") return null;

  return (
    <section
      aria-labelledby="aviso-cadastro-titulo"
      className="border-b border-brick/25 bg-papaya"
    >
      <AppContainer className="flex flex-wrap items-center gap-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-steel-700 ring-1 ring-deep/10">
          <IconePessoa className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p
            id="aviso-cadastro-titulo"
            className="text-sm font-semibold text-molten"
          >
            Termine seu cadastro
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink">
            {frasePendencias(pendencias)} Complete no seu perfil para se
            inscrever nos eventos e emitir certificados.
          </p>
        </div>

        <Link
          href="/conta/perfil"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full bg-deep px-4 text-xs font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
        >
          Completar cadastro
          <IconeSetaDireita className="h-3.5 w-3.5" />
        </Link>
      </AppContainer>
    </section>
  );
}
