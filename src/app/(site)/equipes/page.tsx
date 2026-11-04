import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Entrar em uma equipe",
  description:
    "Digite o código da equipe para ver os membros e entrar no evento.",
};

export const instant = false;

export default async function EquipesPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string | string[] }>;
}) {
  await connection();

  const { codigo } = await searchParams;
  const valor = Array.isArray(codigo) ? codigo[0] : codigo;
  const limpo = (valor ?? "").trim();

  if (limpo) {
    redirect(`/equipes/${encodeURIComponent(limpo)}`);
  }

  return (
    <main className="flex-1 bg-canvas py-16">
      <Container className="max-w-xl">
        <div className="rounded-2xl border border-deep/10 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-deep">
            Entrar com código
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            O código da equipe tem letras e números e foi enviado por quem criou
            o grupo.
          </p>

          <form method="get" action="/equipes" className="mt-6 space-y-3">
            <label
              htmlFor="codigo"
              className="block text-xs font-semibold uppercase tracking-[0.14em] text-deep"
            >
              Código da equipe
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="codigo"
                name="codigo"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="Ex.: A1B2C3"
                className="w-full rounded-xl border border-deep/15 bg-white px-4 py-3 font-mono text-sm uppercase tracking-[0.18em] text-deep shadow-sm outline-none placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10"
              />
              <button
                type="submit"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                Ver equipe
              </button>
            </div>
          </form>
        </div>
      </Container>
    </main>
  );
}
