import Image from "next/image";

/**
 * Marca oficial do Partiu DPM.
 *
 * O selo é um PNG circular com transparência, otimizado a partir do arquivo
 * enviado pela organização. O wordmark foi removido: a marca aparece apenas
 * pelo selo redondo em todas as páginas.
 */
export function LogoMark({
  className = "h-11 w-11",
  prioridade = false,
}: {
  className?: string;
  prioridade?: boolean;
}) {
  return (
    <Image
      src="/marca/logo-oficial-192.png"
      alt="Partiu DPM"
      width={192}
      height={192}
      preload={prioridade}
      className={`rounded-full object-contain ${className}`}
    />
  );
}

export function Logo({
  className = "",
  prioridade = false,
}: {
  className?: string;
  prioridade?: boolean;
}) {
  return (
    <LogoMark
      className={`h-11 w-11 shrink-0 sm:h-12 sm:w-12 ${className}`}
      prioridade={prioridade}
    />
  );
}

/** Versão para fundos navy (rodapé e materiais escuros). */
export function LogoClara({
  className = "",
  prioridade = false,
}: {
  className?: string;
  prioridade?: boolean;
}) {
  return (
    <LogoMark
      className={`h-12 w-12 shrink-0 ring-1 ring-papaya/25 ${className}`}
      prioridade={prioridade}
    />
  );
}
