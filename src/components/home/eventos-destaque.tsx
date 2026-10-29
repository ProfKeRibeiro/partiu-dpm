import { connection } from "next/server";
import { EventoCard } from "@/components/eventos/evento-card";
import { EventosErro, EventosVazio } from "@/components/eventos/estados";
import { eventoRealizado } from "@/lib/evento-utils";
import { listarEventosPublicados } from "@/lib/eventos";

export async function EventosDestaque() {
  await connection();

  const { eventos, erro } = await listarEventosPublicados();

  if (erro) return <EventosErro />;

  const agora = new Date();
  const proximos = eventos
    .filter((evento) => !eventoRealizado(evento, agora))
    .slice(0, 3);

  if (proximos.length === 0) return <EventosVazio />;

  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {proximos.map((evento) => (
        <EventoCard key={evento.id} evento={evento} agora={agora} />
      ))}
    </div>
  );
}
