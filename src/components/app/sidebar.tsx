"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import {
  IconeBilhete,
  IconeCalendario,
  IconeCasa,
  IconeCertificado,
  IconeEscudo,
} from "@/components/ui/icons";

const itens = [
  { href: "/", rotulo: "Início", icone: IconeCasa },
  { href: "/conta/eventos", rotulo: "Eventos", icone: IconeCalendario },
  {
    href: "/conta/inscricoes",
    rotulo: "Minhas inscrições",
    icone: IconeBilhete,
  },
  {
    href: "/conta/certificados",
    rotulo: "Meus certificados",
    icone: IconeCertificado,
  },
] as const;

function estaAtivo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  admin,
  onNavigate,
  className = "",
}: {
  admin: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden bg-deep text-papaya ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-navy-950/80 to-transparent" />

      <div className="relative flex items-center justify-center px-4 py-6">
        <Link
          href="/conta"
          onClick={onNavigate}
          aria-label="Partiu DPM — painel do participante"
          className="inline-flex rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-papaya"
        >
          <LogoMark className="h-36 w-36" prioridade />
        </Link>
      </div>

      <nav
        aria-label="Navegação da área do participante"
        className="relative flex-1 px-3 py-2"
      >
        <ul className="space-y-1.5">
          {itens.map((item) => {
            const Icone = item.icone;
            const ativo = estaAtivo(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papaya ${
                    ativo
                      ? "bg-brick text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.9)]"
                      : "text-papaya/80 hover:bg-papaya/[0.08] hover:text-papaya"
                  }`}
                >
                  <Icone
                    className={`h-5 w-5 shrink-0 ${
                      ativo ? "text-white" : "text-steel-300"
                    }`}
                  />
                  <span className="truncate">{item.rotulo}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative mt-auto px-3 pb-4">
        {admin ? (
          <Link
            href="/admin"
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-papaya/75 transition-colors hover:bg-papaya/[0.08] hover:text-papaya focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papaya"
          >
            <IconeEscudo className="h-5 w-5 shrink-0 text-steel-300" />
            <span className="truncate">Administração</span>
            <span className="ml-auto rounded-full border border-papaya/20 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-papaya/60">
              Restrito
            </span>
          </Link>
        ) : null}

        <div
          className="pointer-events-none relative -mb-5 mt-3 h-28 w-44 opacity-90"
          aria-hidden="true"
        >
          <Image
            src="/marca/seta-azul.png"
            alt=""
            fill
            sizes="176px"
            className="object-contain object-left-bottom"
          />
        </div>
      </div>
    </div>
  );
}
