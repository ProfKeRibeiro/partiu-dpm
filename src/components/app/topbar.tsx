"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import {
  IconeBusca,
  IconeCasa,
  IconeEscudo,
  IconeMenu,
  IconePessoa,
  IconeSair,
  IconeSetaDireita,
  IconeSino,
} from "@/components/ui/icons";
import { sair } from "@/lib/auth/acoes";
import { formatarDataHora } from "@/lib/format";
import {
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} from "@/lib/notificacoes/acoes";
import type { Notificacao } from "@/types/notificacao";

export function Topbar({
  nome,
  email,
  avatarUrl,
  admin = false,
  notificacoes,
  listaNotificacoes,
  onAbrirMenu,
}: {
  nome: string;
  email: string | null;
  avatarUrl?: string | null;
  admin?: boolean;
  notificacoes: number;
  listaNotificacoes: Notificacao[];
  onAbrirMenu: () => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [sinoAberto, setSinoAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sinoRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!menuAberto && !sinoAberto) return;

    function aoClicar(evento: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(evento.target as Node)
      ) {
        setMenuAberto(false);
      }

      if (
        sinoRef.current &&
        !sinoRef.current.contains(evento.target as Node)
      ) {
        setSinoAberto(false);
      }
    }

    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setMenuAberto(false);
        setSinoAberto(false);
      }
    }

    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoPressionar);

    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoPressionar);
    };
  }, [menuAberto, sinoAberto]);

  return (
    <header className="sticky top-0 z-30 border-b border-deep/10 bg-white/95 backdrop-blur-xl">
      <div className="flex h-[5.5rem] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onAbrirMenu}
          aria-label="Abrir menu"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-deep/10 bg-white text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick lg:hidden"
        >
          <IconeMenu className="h-5 w-5" />
        </button>

        <Link
          href="/conta"
          aria-label="Partiu DPM — painel do participante"
          className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brick lg:hidden"
        >
          <LogoMark className="h-[4.5rem] w-[4.5rem]" prioridade />
        </Link>

        <form
          role="search"
          action="/conta/eventos"
          method="get"
          className="hidden min-w-0 flex-1 items-center md:flex"
        >
          <label className="relative flex w-full max-w-[34rem] items-center">
            <span className="sr-only">Buscar eventos</span>
            <IconeBusca className="pointer-events-none absolute left-4 h-[1.1rem] w-[1.1rem] text-steel-700" />
            <input
              type="search"
              name="q"
              placeholder="Buscar eventos..."
              autoComplete="off"
              className="h-11 w-full rounded-full border border-transparent bg-shell/80 pl-11 pr-4 text-sm text-deep outline-none transition-colors placeholder:text-muted/70 focus:border-deep/20 focus:bg-white focus:ring-4 focus:ring-brick/10"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/conta/eventos"
            aria-label="Buscar eventos"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-deep transition-colors hover:bg-papaya/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick md:hidden"
          >
            <IconeBusca className="h-5 w-5" />
          </Link>

          <div ref={sinoRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setSinoAberto((valor) => !valor);
                setMenuAberto(false);
              }}
              aria-expanded={sinoAberto}
              aria-haspopup="menu"
              aria-label={
                notificacoes > 0
                  ? `Notificações — ${notificacoes} não lida(s)`
                  : "Notificações"
              }
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-deep transition-colors hover:bg-papaya/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              <IconeSino className="h-5 w-5" />
              {notificacoes > 0 ? (
                <>
                  <span
                    className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brick px-1 text-[0.6rem] font-bold leading-none text-white ring-2 ring-white"
                    aria-hidden="true"
                  >
                    {notificacoes > 9 ? "9+" : notificacoes}
                  </span>
                  <span className="sr-only">{notificacoes} não lida(s)</span>
                </>
              ) : null}
            </button>

            {sinoAberto ? (
              <div
                role="menu"
                aria-label="Notificações"
                className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-elevada"
              >
                <div className="flex items-center justify-between border-b border-line bg-canvas px-4 py-3">
                  <p className="text-sm font-semibold text-deep">
                    Notificações
                  </p>
                  <span className="rounded-full border border-deep/10 bg-white px-2 py-0.5 text-[0.62rem] font-semibold text-muted">
                    {notificacoes > 0
                      ? `${notificacoes} não lida(s)`
                      : "Tudo lido"}
                  </span>
                </div>

                {listaNotificacoes.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs leading-relaxed text-muted">
                    Nenhuma notificação por enquanto. Avisos de inscrição,
                    presença e certificado aparecem aqui.
                  </p>
                ) : (
                  <ul className="max-h-[21rem] divide-y divide-line overflow-y-auto">
                    {listaNotificacoes.map((notificacao) => {
                      const destino =
                        notificacao.href ?? "/conta/inscricoes";
                      const naoLida = !notificacao.lidaEm;

                      const conteudo = (
                        <>
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              naoLida ? "bg-brick" : "bg-line"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-deep">
                              {notificacao.titulo}
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                              {notificacao.mensagem}
                            </span>
                            <span className="mt-1 block text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted/80">
                              {formatarDataHora(notificacao.criadaEm)}
                            </span>
                          </span>
                        </>
                      );

                      return (
                        <li key={notificacao.id}>
                          {naoLida ? (
                            <form
                              action={marcarNotificacaoLida}
                              onSubmit={() => setSinoAberto(false)}
                            >
                              <input
                                type="hidden"
                                name="notificacao_id"
                                value={notificacao.id}
                              />
                              <input
                                type="hidden"
                                name="href"
                                value={destino}
                              />
                              <input
                                type="hidden"
                                name="retorno"
                                value={pathname}
                              />
                              <button
                                type="submit"
                                className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-papaya/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brick"
                              >
                                {conteudo}
                              </button>
                            </form>
                          ) : (
                            <Link
                              href={destino}
                              onClick={() => setSinoAberto(false)}
                              className="flex items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-papaya/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brick"
                            >
                              {conteudo}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="flex items-center justify-between gap-2 border-t border-line bg-canvas px-3 py-2">
                  <form
                    action={marcarTodasNotificacoesLidas}
                    onSubmit={() => setSinoAberto(false)}
                  >
                    <input type="hidden" name="retorno" value={pathname} />
                    <button
                      type="submit"
                      disabled={notificacoes === 0}
                      className="rounded-full px-2 py-1 text-[0.7rem] font-semibold text-brick underline-offset-4 transition-colors hover:text-molten hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    >
                      Marcar todas como lidas
                    </button>
                  </form>
                  <Link
                    href="/conta/inscricoes"
                    onClick={() => setSinoAberto(false)}
                    className="rounded-full px-2 py-1 text-[0.7rem] font-semibold text-deep underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                  >
                    Minhas inscrições
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <span
            className="mx-1 hidden h-8 w-px bg-line sm:block"
            aria-hidden="true"
          />

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuAberto((valor) => !valor)}
              aria-expanded={menuAberto}
              aria-haspopup="menu"
              aria-label="Abrir menu da conta"
              className="flex items-center gap-2 rounded-full p-1 pr-1.5 transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick sm:pr-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-deep text-papaya ring-2 ring-white">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <IconePessoa className="h-[1.15rem] w-[1.15rem]" />
                )}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[0.65rem] leading-tight text-muted">
                  Olá,
                </span>
                <span className="block max-w-[8.5rem] truncate text-sm font-semibold leading-tight text-deep">
                  {nome}!
                </span>
              </span>
              <IconeSetaDireita
                className={`hidden h-3.5 w-3.5 text-muted transition-transform sm:block ${
                  menuAberto ? "-rotate-90" : "rotate-90"
                }`}
              />
            </button>

            {menuAberto ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-elevada"
              >
                <div className="border-b border-line bg-canvas px-4 py-3">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-brick">
                    Sua conta
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-deep">
                    {nome}
                  </p>
                  {email ? (
                    <p className="truncate text-xs text-muted">{email}</p>
                  ) : null}
                </div>

                <div className="p-1.5">
                  <Link
                    href="/conta"
                    role="menuitem"
                    onClick={() => setMenuAberto(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-papaya/60 hover:text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                  >
                    <IconeCasa className="h-4 w-4 text-steel-700" />
                    Minha área
                  </Link>
                  <Link
                    href="/conta/perfil"
                    role="menuitem"
                    onClick={() => setMenuAberto(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-papaya/60 hover:text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                  >
                    <IconePessoa className="h-4 w-4 text-steel-700" />
                    Meu perfil
                  </Link>
                  {admin ? (
                    <Link
                      href="/admin"
                      role="menuitem"
                      onClick={() => setMenuAberto(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-papaya/60 hover:text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    >
                      <IconeEscudo className="h-4 w-4 text-molten" />
                      Administração
                    </Link>
                  ) : null}
                </div>

                <form action={sair} className="border-t border-line p-1.5">
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-brick transition-colors hover:bg-ember-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                  >
                    <IconeSair className="h-4 w-4" />
                    Sair da conta
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
