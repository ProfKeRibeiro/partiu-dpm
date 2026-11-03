"use client";

import { useRef, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { IconeFechar } from "@/components/ui/icons";
import { useDialogoAcessivel } from "@/components/ui/use-dialogo";
import type { Notificacao } from "@/types/notificacao";

export function AppShell({
  nome,
  email,
  avatarUrl,
  admin,
  notificacoes,
  listaNotificacoes,
  children,
}: {
  nome: string;
  email: string | null;
  avatarUrl: string | null;
  admin: boolean;
  notificacoes: number;
  listaNotificacoes: Notificacao[];
  children: ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);

  useDialogoAcessivel({
    aberto: menuAberto,
    onFechar: () => setMenuAberto(false),
    painelRef,
  });

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-deep/20 lg:block">
        <Sidebar admin={admin} />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-[272px]">
        <Topbar
          nome={nome}
          email={email}
          avatarUrl={avatarUrl}
          admin={admin}
          notificacoes={notificacoes}
          listaNotificacoes={listaNotificacoes}
          onAbrirMenu={() => setMenuAberto(true)}
        />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
      </div>

      {menuAberto ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-navy-950/60 backdrop-blur-sm"
          />
          <div
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu da área do participante"
            tabIndex={-1}
            className="absolute inset-y-0 left-0 w-[288px] max-w-[86vw] shadow-elevada outline-none"
          >
            <Sidebar
              admin={admin}
              contextoDrawer
              onNavigate={() => setMenuAberto(false)}
            />
            <button
              type="button"
              onClick={() => setMenuAberto(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-papaya/20 bg-deep/70 text-papaya transition-colors hover:bg-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papaya"
            >
              <IconeFechar className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
