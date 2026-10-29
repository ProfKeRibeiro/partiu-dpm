import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { FormularioEvento } from "@/components/admin/formulario-evento";
import { Container } from "@/components/ui/container";
import { obterEventoParaEdicao } from "@/lib/admin/consultas";
import { usuarioEhAdmin } from "@/lib/auth/sessao";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Editar evento",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  if (!isSupabaseConfigured) {
    return (
      <main className="flex-1 bg-canvas py-20">
        <Container>
          <p className="rounded-2xl border border-ember-400/40 bg-ember-50 p-6 text-sm text-molten">
            Configure o Supabase para editar eventos.
          </p>
        </Container>
      </main>
    );
  }

  const { id } = await params;

  if (!(await usuarioEhAdmin())) {
    return (
      <AcessoRestrito
        variante="admin"
        destinoLogin={`/admin/eventos/${id}/editar`}
      />
    );
  }

  const evento = await obterEventoParaEdicao(id);

  if (!evento) {
    return (
      <main className="flex-1 bg-canvas py-10 sm:py-14">
        <Container className="max-w-4xl">
          <div className="rounded-2xl border border-ember-300 bg-ember-50 p-6">
            <h1 className="font-display text-xl font-semibold text-molten">
              Não foi possível carregar os dados para edição
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ember-700">
              O evento existe, mas os detalhes protegidos não puderam ser
              carregados. Verifique se a função administrativa do Supabase está
              aplicada e tente novamente.
            </p>
            <Link
              href={`/admin/eventos/${id}`}
              className="mt-4 inline-flex text-sm font-semibold text-molten underline underline-offset-4"
            >
              Voltar aos detalhes do evento
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-canvas py-10 sm:py-14">
      <Container className="max-w-4xl">
        <nav
          aria-label="Trilha de navegação"
          className="flex flex-wrap items-center gap-2 text-xs text-muted"
        >
          <Link href="/admin" className="transition-colors hover:text-brick">
            Administração
          </Link>
          <span>/</span>
          <Link
            href={`/admin/eventos/${id}`}
            className="transition-colors hover:text-brick"
          >
            Evento
          </Link>
          <span>/</span>
          <span className="text-deep">Editar</span>
        </nav>

        <div className="mt-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brick">
            Gerenciamento de evento
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
            Editar {evento.titulo}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Atualize todos os dados do evento. As alterações na página pública
            são aplicadas assim que você salvar.
          </p>
        </div>

        <div className="mt-8">
          <FormularioEvento valoresIniciais={evento} />
        </div>
      </Container>
    </main>
  );
}
