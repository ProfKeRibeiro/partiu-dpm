import Link from "next/link";
import type { ComponentProps } from "react";

type Variante =
  | "primario"
  | "destaque"
  | "secundario"
  | "claro"
  | "contorno"
  | "fantasma";
type Tamanho = "sm" | "md" | "lg";

type Props = ComponentProps<typeof Link> & {
  variante?: Variante;
  tamanho?: Tamanho;
};

const variantes: Record<Variante, string> = {
  primario:
    "bg-deep text-papaya shadow-sm hover:bg-navy-800 active:bg-deep",
  destaque: "bg-brick text-white shadow-sm hover:bg-molten active:bg-brick",
  secundario:
    "border border-deep/20 bg-white text-deep hover:border-deep/35 hover:bg-papaya/60",
  claro:
    "border border-papaya/30 bg-papaya/10 text-papaya hover:border-papaya/50 hover:bg-papaya/20",
  contorno:
    "border border-deep/20 bg-white text-deep hover:border-deep/35 hover:bg-papaya/60",
  fantasma: "text-ink hover:bg-deep/[0.06] hover:text-deep",
};

const tamanhos: Record<Tamanho, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[0.95rem]",
};

export function ButtonLink({
  variante = "primario",
  tamanho = "md",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <Link
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${variantes[variante]} ${tamanhos[tamanho]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
