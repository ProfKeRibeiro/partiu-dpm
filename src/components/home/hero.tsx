import { Suspense } from "react";
import Image from "next/image";
import { connection } from "next/server";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import {
  IconeBilhete,
  IconeCalendario,
  IconeCertificado,
  IconeSetaDireita,
  IconeUsuarios,
} from "@/components/ui/icons";
import { eventoRealizado } from "@/lib/evento-utils";
import { listarEventosPublicados } from "@/lib/eventos";

async function NumeroEventos() {
  await connection();

  const { eventos, erro } = await listarEventosPublicados();

  if (erro) return <span>—</span>;

  const agora = new Date();
  const total = eventos.filter(
    (evento) => !eventoRealizado(evento, agora),
  ).length;

  return <span>{String(total).padStart(2, "0")}</span>;
}

const iconesIndicadores = {
  agenda: IconeCalendario,
  inscricoes: IconeBilhete,
  certificados: IconeCertificado,
  comunidade: IconeUsuarios,
};

export function Hero() {
  const indicadores = [
    {
      rotulo: "eventos na agenda",
      icone: iconesIndicadores.agenda,
      valor: (
        <Suspense
          fallback={
            <span className="inline-block h-6 w-8 animate-pulse rounded bg-papaya/20 align-middle" />
          }
        >
          <NumeroEventos />
        </Suspense>
      ),
    },
    {
      rotulo: "inscrições e cancelamentos",
      icone: iconesIndicadores.inscricoes,
      valor: "Online",
    },
    {
      rotulo: "certificados com validação",
      icone: iconesIndicadores.certificados,
      valor: "Digital",
    },
    {
      rotulo: "para toda a comunidade",
      icone: iconesIndicadores.comunidade,
      valor: "Aberta",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-deep text-papaya">
      <Image
        src="/marca/fachada-home2.png"
        alt=""
        fill
        preload
        quality={100}
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-deep/88 via-deep/68 to-deep/20" />
      <div className="absolute inset-0 bg-deep/10" />
      <div className="pointer-events-none absolute inset-0 bg-grid-fina opacity-20" />

      <div className="pointer-events-none absolute right-0 top-1/2 hidden w-[clamp(7rem,20vw,22rem)] -translate-y-1/2 sm:block sm:right-2 xl:right-8">
        <Image
          src="/marca/aviao-vermelho.png"
          alt=""
          width={376}
          height={190}
          sizes="(min-width: 1760px) 352px, 20vw"
          className="h-auto w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.28)]"
        />
      </div>

      <Container className="relative py-10 sm:py-12 lg:py-16">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-steel-300">
            <span
              className="h-0.5 w-7 rounded-full bg-brick"
              aria-hidden="true"
            />
            Agenda da comunidade DPM
          </p>

          <h1 className="mt-4 text-balance font-display text-4xl font-bold leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-[3.9rem]">
            Bem-vindo(a)!
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-papaya/85 sm:text-lg">
            O Partiu DPM reúne palestras, oficinas e encontros da comunidade
            escolar para aprender, trocar ideias e ir mais longe.
          </p>

          <div className="mt-7">
            <ButtonLink href="/eventos" variante="destaque" tamanho="lg">
              Explorar eventos
              <IconeSetaDireita className="h-4 w-4" />
            </ButtonLink>
          </div>

          <dl className="mt-9 grid max-w-3xl grid-cols-2 gap-2.5 lg:grid-cols-4">
            {indicadores.map((indicador) => {
              const Icone = indicador.icone;

              return (
                <div
                  key={indicador.rotulo}
                  className="flex items-center gap-2.5 rounded-xl border border-papaya/15 bg-deep/45 px-3 py-2.5 backdrop-blur-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-papaya/10 text-steel-300">
                    <Icone className="h-4 w-4" />
                  </span>
                  <div>
                    <dd className="font-display text-lg font-bold leading-none text-white">
                      {indicador.valor}
                    </dd>
                    <dt className="mt-1 text-[0.6rem] leading-snug text-papaya/65">
                      {indicador.rotulo}
                    </dt>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </Container>
    </section>
  );
}
