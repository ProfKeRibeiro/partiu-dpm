import type { ReactNode } from "react";

/** Container da área autenticada, alinhado ao conteúdo da sidebar. */
export function AppContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[1360px] px-5 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}
