import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Participação de escolas",
  description:
    "Digite o código de subinscrição da escola para inscrever os alunos no evento.",
};

export const instant = false;

export default async function EscolasPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string | string[] }>;
}) {
  await connection();

  const { codigo } = await searchParams;
  const valor = Array.isArray(codigo) ? codigo[0] : codigo;
  const limpo = (valor ?? "").trim();

  if (limpo) {
    redirect(`/escolas/${encodeURIComponent(limpo)}`);
  }

  return (
    <main className="flex-1 bg-canvas py-16">
      <Container className="max-w-xl">
        <div className="rounded-2xl border border-deep/10 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-deep">
            Participação de escolas
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Professores e coordenadores inscrevem a escola e recebem um código.
            Com ele, os alunos preenchem os próprios dados para participar do
            evento.
          </p>

          <form method="get" action="/escolas" className="mt-6 space-y-3">
            <label
              htmlFor="codigo-escola"
              className="block text-xs font-semibold uppercase tracking-[0.14em] text-deep"
            >
              Código da escola
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="codigo-escola"
                name="codigo"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="Ex.: ESC-1234"
                className="w-full rounded-xl border border-deep/15 bg-white px-4 py-3 font-mono text-sm uppercase tracking-[0.14em] text-deep shadow-sm outline-none placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10"
              />
              <button
                type="submit"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                Continuar
              </button>
            </div>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-muted">
            A escola é inscrita pela organização do evento. Se você é aluno,
            peça o código ao professor responsável.
          </p>
        </div>
      </Container>
    </main>
  );
}
