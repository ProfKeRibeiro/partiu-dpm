"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { sair } from "@/lib/auth/acoes";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import {
  IconeCasa,
  IconeFechar,
  IconeMenu,
  IconePessoa,
  IconeSetaDireita,
  IconeSair,
} from "@/components/ui/icons";

const links = [
  { href: "/eventos", rotulo: "Eventos" },
  { href: "/certificados", rotulo: "Validar certificado" },
  { href: "/#como-funciona", rotulo: "Como funciona" },
] as const;

export function SiteHeader({
  estadoSessao,
  nome,
  avatarUrl,
}: {
  estadoSessao: "carregando" | "autenticado" | "anonimo";
  nome?: string | null;
  avatarUrl?: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [menuContaAberto, setMenuContaAberto] = useState(false);
  const menuContaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const aoPressionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
    };

    window.addEventListener("keydown", aoPressionar);
    return () => window.removeEventListener("keydown", aoPressionar);
  }, [aberto]);

  useEffect(() => {
    if (!menuContaAberto) return;

    const aoClicarFora = (evento: MouseEvent) => {
      if (
        menuContaRef.current &&
        !menuContaRef.current.contains(evento.target as Node)
      ) {
        setMenuContaAberto(false);
      }
    };

    const aoPressionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setMenuContaAberto(false);
    };

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoPressionar);

    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoPressionar);
    };
  }, [menuContaAberto]);

  return (
    <header className="sticky top-0 z-50 border-t-[3px] border-b border-b-line border-t-brick bg-canvas/95 backdrop-blur-xl">
      <Container className="flex h-[4.75rem] items-center justify-between gap-4 lg:h-20">
        <Link
          href="/"
          aria-label="Partiu DPM — página inicial"
          onClick={() => setAberto(false)}
          className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brick"
        >
          <Logo className="h-[3.25rem] w-[3.25rem] sm:h-14 sm:w-14" prioridade />
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Navegação principal"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink/80 transition-colors hover:bg-deep/[0.06] hover:text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              {link.rotulo}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {estadoSessao === "autenticado" ? (
            <div ref={menuContaRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuContaAberto}
                aria-controls="menu-conta-site"
                aria-label="Abrir menu da conta"
                onClick={() => setMenuContaAberto((valor) => !valor)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep transition-colors hover:border-deep/35 hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-deep text-papaya">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      width={32}
                      height={32}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <IconePessoa className="h-4 w-4" />
                  )}
                </span>
                <span className="max-w-[7rem] truncate">
                  {nome?.trim().split(/\s+/)[0] ?? "Minha conta"}
                </span>
                <IconeSetaDireita
                  className={`h-3.5 w-3.5 text-muted transition-transform ${
                    menuContaAberto ? "-rotate-90" : "rotate-90"
                  }`}
                />
              </button>
              {menuContaAberto ? (
                <div
                  id="menu-conta-site"
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-deep/10 bg-white p-1.5 shadow-elevada"
                >
                  {nome ? (
                    <p className="truncate px-3 py-2 text-xs font-medium text-muted">
                      {nome}
                    </p>
                  ) : null}
                  <Link
                    href="/conta"
                    role="menuitem"
                    onClick={() => setMenuContaAberto(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-papaya/60 hover:text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                  >
                    <IconeCasa className="h-4 w-4 text-steel-700" />
                    Minha área
                  </Link>
                  <Link
                    href="/conta/perfil"
                    role="menuitem"
                    onClick={() => setMenuContaAberto(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-papaya/60 hover:text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                  >
                    <IconePessoa className="h-4 w-4 text-steel-700" />
                    Meu perfil
                  </Link>
                  <form action={sair} className="mt-1 border-t border-line pt-1">
                    <button
                      type="submit"
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-brick transition-colors hover:bg-ember-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    >
                      <IconeSair className="h-4 w-4" />
                      Sair da conta
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : estadoSessao === "anonimo" ? (
            <ButtonLink href="/conta" variante="fantasma" tamanho="sm">
              Minha área
            </ButtonLink>
          ) : (
            <span
              aria-hidden="true"
              className="h-9 w-28 animate-pulse rounded-full bg-deep/[0.06]"
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => setAberto((valor) => !valor)}
          aria-expanded={aberto}
          aria-controls="menu-mobile"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-deep/15 bg-white text-deep transition-colors hover:border-deep/30 hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick lg:hidden"
        >
          {aberto ? (
            <IconeFechar className="h-5 w-5" />
          ) : (
            <IconeMenu className="h-5 w-5" />
          )}
        </button>
      </Container>

      {aberto ? (
        <div
          id="menu-mobile"
          className="absolute inset-x-0 top-full border-b border-line bg-white shadow-elevada lg:hidden"
        >
          <Container className="flex flex-col gap-1 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setAberto(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-ink transition-colors hover:bg-papaya/60 hover:text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
              >
                {link.rotulo}
              </Link>
            ))}

            <div className="mt-3 border-t border-line pt-4">
              {estadoSessao === "autenticado" ? (
                <div>
                  <div className="mb-3 flex items-center gap-3 rounded-xl bg-canvas p-3">
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-deep text-papaya">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <IconePessoa className="h-5 w-5" />
                      )}
                    </span>
                    <span className="truncate text-sm font-semibold text-deep">
                      {nome?.trim().split(/\s+/)[0] ?? "Minha conta"}
                    </span>
                  </div>
                  <div className="grid gap-2">
                  <ButtonLink
                    href="/conta"
                    variante="contorno"
                    tamanho="md"
                    onClick={() => setAberto(false)}
                  >
                    <IconeCasa className="h-4 w-4" />
                    Minha área
                  </ButtonLink>
                  <ButtonLink
                    href="/conta/perfil"
                    variante="contorno"
                    tamanho="md"
                    onClick={() => setAberto(false)}
                  >
                    <IconePessoa className="h-4 w-4" />
                    Meu perfil
                  </ButtonLink>
                  <form action={sair}>
                    <button
                      type="submit"
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-brick/30 bg-white px-5 text-sm font-semibold text-brick transition-colors hover:bg-ember-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    >
                      <IconeSair className="h-4 w-4" />
                      Sair da conta
                    </button>
                  </form>
                  </div>
                </div>
              ) : estadoSessao === "anonimo" ? (
                <ButtonLink
                  href="/conta"
                  variante="contorno"
                  tamanho="md"
                  className="w-full"
                  onClick={() => setAberto(false)}
                >
                  Minha área
                </ButtonLink>
              ) : (
                <span
                  aria-hidden="true"
                  className="block h-11 animate-pulse rounded-full bg-deep/[0.06]"
                />
              )}
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
