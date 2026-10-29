import { connection } from "next/server";
import { EventoCard } from "@/components/eventos/evento-card";
import { EventosErro, EventosVazio } from "@/components/eventos/estados";
import { eventoRealizado } from "@/lib/evento-utils";
import { listarEventosPublicados } from "@/lib/eventos";

function contagem(total: number, singular: string, plural: string) {
  return `${total} ${total === 1 ? singular : plural}`;
}

export async function AgendaCompleta() {
  await connection();

  const { eventos, erro } = await listarEventosPublicados();

  if (erro) return <EventosErro />;

  if (eventos.length === 0) {
    return (
      <EventosVazio
        titulo="Nenhum evento publicado no momento"
        descricao="A agenda está sendo preparada. Novos encontros serão divulgados em breve."
      />
    );
  }

  const agora = new Date();
  const proximos = eventos.filter(
    (evento) => !eventoRealizado(evento, agora),
  );
  const passados = eventos
    .filter((evento) => eventoRealizado(evento, agora))
    .sort(
      (a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime(),
    );

  return (
    <div className="space-y-16">
      <section aria-labelledby="proximos-eventos">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brick">
              <span className="h-px w-7 bg-brick" aria-hidden="true" />
              Em destaque
            </p>
            <h2
              id="proximos-eventos"
              className="mt-3 font-display text-2xl font-semibold tracking-tight text-deep sm:text-3xl"
            >
              Próximos eventos
            </h2>
          </div>
          <p className="text-sm text-muted">
            {contagem(proximos.length, "evento", "eventos")}
          </p>
        </div>

        {proximos.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {proximos.map((evento) => (
              <EventoCard key={evento.id} evento={evento} agora={agora} />
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-deep/20 bg-white px-5 py-8 text-center text-sm text-muted">
            Nenhum evento com data futura no momento. Confira novamente em
            breve.
          </p>
        )}
      </section>

      {passados.length > 0 ? (
        <section aria-labelledby="eventos-realizados">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted">
                Arquivo
              </p>
              <h2
                id="eventos-realizados"
                className="mt-3 font-display text-2xl font-semibold tracking-tight text-deep sm:text-3xl"
              >
                Já aconteceram
              </h2>
            </div>
            <p className="text-sm text-muted">
              {contagem(passados.length, "evento", "eventos")}
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {passados.map((evento) => (
              <EventoCard key={evento.id} evento={evento} agora={agora} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
