import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { AppShell } from "@/components/app/shell";
import { ShellCarregando } from "@/components/app/estados";
import { obterPerfil, obterUsuario, usuarioEhAdmin } from "@/lib/auth/sessao";
import { isSupabaseConfigured } from "@/lib/env";
import { listarMinhasInscricoes } from "@/lib/inscricoes/consultas";

export const metadata: Metadata = {
  title: "Minha área",
  description:
    "Seus eventos, inscrições, presenças e certificados no Partiu DPM.",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellCarregando />}>
      <SessaoApp>{children}</SessaoApp>
    </Suspense>
  );
}

async function SessaoApp({ children }: { children: ReactNode }) {
  await connection();

  if (!isSupabaseConfigured) {
    return (
      <main className="flex flex-1 items-center bg-canvas py-16">
        <div className="mx-auto w-full max-w-xl px-5">
          <div className="rounded-2xl border border-ember-400/40 bg-ember-50 p-6">
            <h1 className="font-display text-2xl font-semibold text-molten">
              Supabase não configurado
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ember-700">
              Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no{" "}
              <code>.env.local</code> para usar a área do participante.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const usuario = await obterUsuario();

  if (!usuario) {
    return <AcessoRestrito variante="sessao" destinoLogin="/conta" />;
  }

  const [perfil, admin, inscricoes] = await Promise.all([
    obterPerfil(),
    usuarioEhAdmin(),
    listarMinhasInscricoes(),
  ]);

  const nome = perfil?.nome_completo ?? usuario.nome ?? "participante";

  const notificacoes = inscricoes.filter(
    (inscricao) =>
      inscricao.status === "confirmada" && inscricao.evento !== null,
  ).length;

  return (
    <AppShell
      nome={nome}
      email={usuario.email}
      avatarUrl={usuario.avatarUrl}
      admin={admin}
      notificacoes={notificacoes}
    >
      {children}
    </AppShell>
  );
}
