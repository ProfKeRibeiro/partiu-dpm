import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FormularioEntrarEquipe } from "@/components/equipes/formulario-entrar-equipe";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import { IconeCalendario, IconeLocal, IconeUsuarios } from "@/components/ui/icons";
import { obterUsuario } from "@/lib/auth/sessao";
import { obterEquipePorCodigo, obterMinhaEquipeNoEvento } from "@/lib/equipes/consultas";
import { formatarPeriodo } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Equipe",
  robots: { index: false, follow: false },
};

export const instant = false;

const ROTULOS_STATUS: Record<string, string> = {
  formando: "Formando equipe",
  confirmada: "Equipe confirmada",
  cancelada: "Equipe cancelada",
};

export default async function EquipePublicaPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  await connection();

  const { codigo } = await params;
  const equipe = await obterEquipePorCodigo(codigo);

  if (!equipe) {
    return (
      <main className="flex-1 bg-canvas py-16">
        <Container className="max-w-xl">
          <div className="rounded-2xl border border-deep/10 bg-white p-8 text-center shadow-sm">
            <h1 className="font-display text-2xl font-semibold text-deep">
              Equipe não encontrada
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Confira o código com quem criou a equipe. O código tem letras e
              números e não diferencia maiúsculas de minúsculas.
            </p>
            <ButtonLink href="/equipes" className="mt-6">
              Digitar outro código
            </ButtonLink>
          </div>
        </Container>
      </main>
    );
  }

  const usuario = isSupabaseConfigured ? await obterUsuario() : null;
  const minhaEquipe = usuario
    ? await obterMinhaEquipeNoEvento(equipe.evento.id)
    : null;

  const souMembro = minhaEquipe?.id === equipe.id;
  const outraEquipe = minhaEquipe && !souMembro;
  const cheia = equipe.vagasRestantes <= 0;
  const cancelada = equipe.status === "cancelada";
  const encerrada = equipe.evento.fim
    ? new Date(equipe.evento.fim).getTime() < new Date().getTime()
    : false;

  return (
    <main className="flex-1 bg-canvas py-10 sm:py-14">
      <Container className="max-w-2xl">
        <nav
          aria-label="Trilha de navegação"
          className="flex flex-wrap items-center gap-2 text-xs text-muted"
        >
          <Link href="/eventos" className="hover:text-brick">
            Eventos
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/eventos/${equipe.evento.id}`}
            className="hover:text-brick"
          >
            {equipe.evento.titulo}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-deep">Equipe</span>
        </nav>

        <div className="mt-6 rounded-2xl border border-deep/10 bg-white p-6 shadow-sm sm:p-8">
          <p
            className={`inline-flex rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
              cancelada
                ? "border-ember-300 bg-ember-50 text-molten"
                : equipe.status === "confirmada"
                  ? "border-steel-300 bg-steel-50 text-deep"
                  : "border-brick/25 bg-papaya text-molten"
            }`}
          >
            {ROTULOS_STATUS[equipe.status]}
          </p>

          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-deep">
            {equipe.nome}
          </h1>

          <p className="mt-2 font-mono text-xs tracking-[0.18em] text-muted">
            Código {equipe.codigo}
          </p>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-start gap-2 text-ink">
              <IconeCalendario className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
              <div>
                <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Evento
                </dt>
                <dd className="mt-0.5 font-semibold text-deep">
                  {equipe.evento.titulo}
                </dd>
                <dd className="text-xs text-muted">
                  {equipe.evento.inicio
                    ? formatarPeriodo(equipe.evento.inicio, equipe.evento.fim)
                    : "Data a definir"}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-2 text-ink">
              <IconeLocal className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
              <div>
                <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Local
                </dt>
                <dd className="mt-0.5">{equipe.evento.local ?? "A definir"}</dd>
              </div>
            </div>

            <div className="flex items-start gap-2 text-ink">
              <IconeUsuarios className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
              <div>
                <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Membros
                </dt>
                <dd className="mt-0.5">
                  {equipe.membros.length} de {equipe.evento.equipeMax} ·{" "}
                  {equipe.vagasRestantes} vaga(s) restante(s)
                </dd>
                <dd className="mt-1 text-xs text-muted">
                  Mínimo para confirmar: {equipe.evento.equipeMin}
                </dd>
              </div>
            </div>

            {equipe.orientadorNome ? (
              <div>
                <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Orientador
                </dt>
                <dd className="mt-0.5">{equipe.orientadorNome}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6 border-t border-line pt-5">
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Quem está na equipe
            </h2>
            <ul className="mt-2 space-y-1.5">
              {equipe.membros.map((membro, indice) => (
                <li
                  key={`${membro.nome}-${indice}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-sm text-ink"
                >
                  <span className="truncate">{membro.nome}</span>
                  {membro.papel === "lider" ? (
                    <span className="shrink-0 rounded-full border border-brick/25 bg-white px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-molten">
                      Líder
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            {cancelada ? (
              <p role="status" className="text-sm text-molten">
                Esta equipe foi cancelada e não aceita novos membros.
              </p>
            ) : souMembro ? (
              <div className="space-y-2">
                <p role="status" className="text-sm font-medium text-deep">
                  Você faz parte desta equipe.
                </p>
                <ButtonLink href="/conta/inscricoes" variante="contorno">
                  Ver minhas inscrições
                </ButtonLink>
              </div>
            ) : outraEquipe ? (
              <p role="status" className="text-sm text-molten">
                Você já está em outra equipe deste evento. Saia dela antes de
                entrar em outra.
              </p>
            ) : cheia ? (
              <p role="status" className="text-sm text-molten">
                A equipe está completa ({equipe.evento.equipeMax} membros).
              </p>
            ) : encerrada ? (
              <p role="status" className="text-sm text-molten">
                O evento já aconteceu e a equipe não recebe novos membros.
              </p>
            ) : usuario ? (
              <FormularioEntrarEquipe codigo={equipe.codigo} />
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  Entre na sua conta para entrar nesta equipe.
                </p>
                <ButtonLink
                  href={`/entrar?next=${encodeURIComponent(`/equipes/${equipe.codigo}`)}`}
                >
                  Entrar para participar
                </ButtonLink>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link
            href={`/eventos/${equipe.evento.id}`}
            className="font-semibold text-brick underline underline-offset-4 hover:text-molten"
          >
            Ver a página do evento
          </Link>
        </p>
      </Container>
    </main>
  );
}
