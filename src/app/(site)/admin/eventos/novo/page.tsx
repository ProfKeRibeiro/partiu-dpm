import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { FormularioEvento } from "@/components/admin/formulario-evento";
import { Container } from "@/components/ui/container";
import { usuarioEhAdmin } from "@/lib/auth/sessao";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Cadastrar evento", robots: { index: false, follow: false } };
export const instant = false;

export default async function NovoEventoPage() {
  await connection();

  if (!isSupabaseConfigured) {
    return <main className="flex-1 bg-canvas py-20"><Container><p className="rounded-2xl border border-ember-400/40 bg-ember-50 p-6 text-sm text-molten">Configure o Supabase para cadastrar eventos.</p></Container></main>;
  }
  if (!(await usuarioEhAdmin())) return <AcessoRestrito variante="admin" destinoLogin="/admin/eventos/novo" />;

  return (
    <main className="flex-1 bg-canvas py-10 sm:py-14">
      <Container className="max-w-4xl">
        <nav aria-label="Trilha de navegação" className="flex items-center gap-2 text-xs text-muted"><Link href="/admin" className="hover:text-brick">Administração</Link><span>/</span><span className="text-deep">Novo evento</span></nav>
        <div className="mt-5"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brick">Agenda DPM</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">Cadastrar evento</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Preencha os detalhes e salve como rascunho ou publique quando estiver pronto.</p></div>
        <div className="mt-8"><FormularioEvento /></div>
      </Container>
    </main>
  );
}
