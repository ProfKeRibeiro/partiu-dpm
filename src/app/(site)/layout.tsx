import type { ReactNode } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { obterPerfil, obterUsuario } from "@/lib/auth/sessao";
import { isSupabaseConfigured } from "@/lib/env";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<SiteHeader estadoSessao="carregando" />}>
        <CabecalhoComSessao />
      </Suspense>
      <div id="conteudo" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}

async function CabecalhoComSessao() {
  await connection();

  if (!isSupabaseConfigured) {
    return <SiteHeader estadoSessao="anonimo" />;
  }

  const usuario = await obterUsuario();
  const perfil = usuario ? await obterPerfil() : null;

  return (
    <SiteHeader
      estadoSessao={usuario ? "autenticado" : "anonimo"}
      nome={perfil?.nome_completo ?? usuario?.nome ?? null}
      avatarUrl={usuario?.avatarUrl ?? null}
    />
  );
}
