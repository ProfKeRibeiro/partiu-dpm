"use client";

import Image from "next/image";
import { useState } from "react";
import { IconePessoa } from "@/components/ui/icons";
import { iniciais } from "@/lib/app-utils";

const TAMANHOS: Record<number, string> = {
  32: "text-[0.65rem] font-semibold",
  36: "text-[0.7rem] font-semibold",
  40: "text-xs font-semibold",
  56: "text-base font-semibold",
  64: "font-display text-lg font-bold",
};

/**
 * Avatar único do portal.
 *
 * A foto vem de uma URL assinada que expira; quando o carregamento falha, o
 * componente troca a imagem pelas iniciais (ou pelo ícone, sem nome) em vez de
 * deixar o círculo vazio ou o texto alternativo cortado.
 */
export function Avatar({
  src,
  nome,
  tamanho = 36,
  alt = "",
  className = "",
}: {
  src?: string | null;
  nome?: string | null;
  tamanho?: 32 | 36 | 40 | 56 | 64;
  /** Texto alternativo; vazio quando o avatar é decorativo (ao lado do nome). */
  alt?: string;
  className?: string;
}) {
  const [srcComFalha, setSrcComFalha] = useState<string | null>(null);

  const mostrarImagem = Boolean(src) && srcComFalha !== src;
  const nomeLimpo = nome?.trim() ?? "";

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-deep text-papaya ${className}`}
    >
      {mostrarImagem ? (
        <Image
          src={src as string}
          alt={alt}
          width={tamanho}
          height={tamanho}
          unoptimized
          onError={() => setSrcComFalha(src ?? null)}
          className="h-full w-full object-cover"
        />
      ) : nomeLimpo ? (
        <>
          <span
            aria-hidden="true"
            className={`leading-none ${TAMANHOS[tamanho] ?? TAMANHOS[36]}`}
          >
            {iniciais(nomeLimpo)}
          </span>
          {alt ? <span className="sr-only">{alt}</span> : null}
        </>
      ) : (
        <IconePessoa
          aria-hidden="true"
          className={tamanho >= 56 ? "h-6 w-6" : "h-4 w-4"}
        />
      )}
    </span>
  );
}
