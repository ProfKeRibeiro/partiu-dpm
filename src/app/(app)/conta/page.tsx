import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { AppContainer } from "@/components/app/container";
import { CartaoEventoApp } from "@/components/app/cartao-evento";
import { EstadoVazio, AvisoApp } from "@/components/app/estados";
import { HeroParticipante } from "@/components/app/hero-participante";
import { ProximoEventoItem } from "@/components/app/proximo-evento";
import { ButtonLink } from "@/components/ui/button-link";
import {
  IconeCalendario,
  IconeCertificado,
  IconeSetaDireita,
} from "@/components/ui/icons";
import { primeiroNome } from "@/lib/app-utils";
import { obterPerfil, obterUsuario } from "@/lib/auth/sessao";
import { eventoRealizado } from "@/lib/evento-utils";
import { listarEventosPublicados } from "@/lib/eventos";
import { listarMinhasInscricoes } from "@/lib/inscricoes/consultas";

export const metadata: Metadata = {
  title: "Início",
  description:
    "Seu painel de eventos, inscrições, presenças e certificados do Partiu DPM.",
};

export const instant = false;

export default function ContaPage() {
  return (
    <Suspense fallback={<PainelCarregando />}>
      <Painel />
    </Suspense>
  );
}

async function Painel() {
  await connection();

  const usuario = await obterUsuario();

  if (!usuario) {
    return <AcessoRestrito variante="sessao" destinoLogin="/conta" />;
  }

  const [perfil, inscricoes, agenda] = await Promise.all([
    obterPerfil(),
    listarMinhasInscricoes(),
    listarEventosPublicados(),
  ]);

  const nome = perfil?.nome_completo ?? usuario.nome ?? "participante";
  const agora = new Date();
  const agoraMs = agora.getTime();

  const confirmadas = inscricoes.filter(
    (inscricao) => inscricao.status === "confirmada",
  );
  const inscritos = new Set(
    confirmadas
      .map((inscricao) => inscricao.evento?.id)
      .filter((id): id is string => Boolean(id)),
  );

  const meusProximos = confirmadas
    .filter(
      (inscricao) =>
        inscricao.evento &&
        new Date(inscricao.evento.fim).getTime() >= agoraMs,
    )
    .sort(
      (a, b) =>
        new Date(a.evento?.inicio ?? 0).getTime() -
        new Date(b.evento?.inicio ?? 0).getTime(),
    )
    .slice(0, 4);

  const proximosEventos = agenda.eventos
    .filter((evento) => !eventoRealizado(evento, agora))
    .slice(0, 2);

  return (
    <>
      <HeroParticipante nome={primeiroNome(nome)} />

      <AppContainer className="py-7 sm:py-9">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <section aria-labelledby="proximos-eventos">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="flex items-center gap-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brick">
                  <span className="h-px w-6 bg-brick" aria-hidden="true" />
                  Agenda
                </p>
                <h2
                  id="proximos-eventos"
                  className="mt-2 font-display text-2xl font-semibold tracking-tight text-deep"
                >
                  Próximos eventos
                </h2>
              </div>
              <Link
                href="/conta/eventos"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brick underline-offset-4 transition-colors hover:text-molten hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
              >
                Ver todos
                <IconeSetaDireita className="h-4 w-4" />
              </Link>
            </div>

            {agenda.erro ? (
              <AvisoApp tom="alerta" className="mt-5">
                Não foi possível carregar a agenda agora. Tente recarregar a
                página em instantes.
              </AvisoApp>
            ) : null}

            {proximosEventos.length > 0 ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {proximosEventos.map((evento) => (
                  <CartaoEventoApp
                    key={evento.id}
                    evento={evento}
                    inscrito={inscritos.has(evento.id)}
                  />
                ))}
              </div>
            ) : (
              <EstadoVazio
                className="mt-5"
                icone={<IconeCalendario className="h-5 w-5" />}
                titulo="Nenhum evento publicado no momento"
                descricao="A agenda está sendo preparada. Assim que novos encontros forem publicados, eles aparecem aqui."
                acao={
                  <ButtonLink href="/conta/eventos" tamanho="sm">
                    Explorar eventos
                    <IconeSetaDireita className="h-4 w-4" />
                  </ButtonLink>
                }
              />
            )}
          </section>

          <aside>
            <section
              aria-labelledby="meus-proximos"
              className="rounded-2xl border border-deep/10 bg-white shadow-suave"
            >
              <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-papaya text-steel-700 ring-1 ring-deep/10">
                  <IconeCalendario className="h-4 w-4" />
                </span>
                <h2
                  id="meus-proximos"
                  className="font-display text-base font-semibold text-deep"
                >
                  Seus próximos eventos
                </h2>
              </div>

              {meusProximos.length > 0 ? (
                <>
                  <ul className="divide-y divide-line px-2.5 py-1">
                    {meusProximos.map((inscricao) => {
                      const evento = inscricao.evento;
                      if (!evento) return null;

                      return (
                        <ProximoEventoItem
                          key={inscricao.id}
                          id={evento.id}
                          titulo={evento.titulo}
                          inicio={evento.inicio}
                          fim={evento.fim}
                        />
                      );
                    })}
                  </ul>
                  <div className="border-t border-line px-4 py-3">
                    <Link
                      href="/conta/inscricoes"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brick underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    >
                      Ver minhas inscrições
                      <IconeSetaDireita className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="px-4 py-6 text-center">
                  <IconeCertificado className="mx-auto h-8 w-8 text-steel-500" />
                  <p className="mt-3 text-sm font-medium text-deep">
                    Nenhum evento a caminho
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Inscreva-se em um evento para acompanhar seus próximos
                    compromissos por aqui.
                  </p>
                  <ButtonLink
                    href="/conta/eventos"
                    variante="contorno"
                    tamanho="sm"
                    className="mt-4"
                  >
                    Encontrar evento
                  </ButtonLink>
                </div>
              )}
            </section>
          </aside>
        </div>
      </AppContainer>
    </>
  );
}

function PainelCarregando() {
  return (
    <>
      <div className="h-72 animate-pulse bg-deep/90 sm:h-80" />
      <AppContainer className="py-7 sm:py-9">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div className="h-8 w-52 animate-pulse rounded-lg bg-deep/10" />
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, indice) => (
                <div
                  key={indice}
                  className="h-80 animate-pulse rounded-2xl border border-deep/10 bg-white"
                />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-72 animate-pulse rounded-2xl border border-deep/10 bg-white" />
            <div className="h-56 animate-pulse rounded-2xl border border-deep/10 bg-white" />
          </div>
        </div>
      </AppContainer>
    </>
  );
}
