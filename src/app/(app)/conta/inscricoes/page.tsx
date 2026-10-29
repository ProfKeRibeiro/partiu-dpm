import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { CabecalhoApp } from "@/components/app/cabecalho";
import { AppContainer } from "@/components/app/container";
import {
  ConteudoCarregando,
  EstadoVazio,
} from "@/components/app/estados";
import { BotaoCancelarInscricao } from "@/components/inscricoes/botao-cancelar";
import { ButtonLink } from "@/components/ui/button-link";
import {
  IconeBilhete,
  IconeCertificado,
  IconeCheck,
  IconeGlobo,
  IconeLocal,
  IconeRelogio,
} from "@/components/ui/icons";
import { obterUsuario } from "@/lib/auth/sessao";
import { ROTULOS_MODALIDADE } from "@/lib/evento-utils";
import { formatarDataCurta, formatarPeriodo, partesDaData } from "@/lib/format";
import {
  listarMinhasInscricoes,
  type InscricaoDoUsuario,
  type StatusInscricao,
} from "@/lib/inscricoes/consultas";

export const metadata: Metadata = {
  title: "Minhas inscrições",
  description:
    "Acompanhe suas inscrições, presenças e certificados nos eventos do Partiu DPM.",
};

export const instant = false;

type Filtro = "todas" | StatusInscricao;

const ABAS: { valor: Filtro; rotulo: string; rotuloCurto: string }[] = [
  { valor: "todas", rotulo: "Todas", rotuloCurto: "Todas" },
  { valor: "confirmada", rotulo: "Confirmadas", rotuloCurto: "Confirmadas" },
  {
    valor: "lista_espera",
    rotulo: "Lista de espera",
    rotuloCurto: "Espera",
  },
  { valor: "cancelada", rotulo: "Canceladas", rotuloCurto: "Canceladas" },
];

const ROTULOS_STATUS: Record<StatusInscricao, string> = {
  confirmada: "Inscrição confirmada",
  lista_espera: "Lista de espera",
  cancelada: "Inscrição cancelada",
};

const ESTILOS_STATUS: Record<StatusInscricao, string> = {
  confirmada: "border-steel-300 bg-steel-50 text-deep",
  lista_espera: "border-brick/30 bg-papaya text-molten",
  cancelada: "border-line bg-shell text-muted",
};

function filtroValido(valor: string | undefined): Filtro {
  if (
    valor === "confirmada" ||
    valor === "lista_espera" ||
    valor === "cancelada"
  ) {
    return valor;
  }

  return "todas";
}

export default function InscricoesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <>
      <CabecalhoApp
        eyebrow="Participação"
        titulo="Minhas inscrições"
        descricao="Veja o status das suas inscrições, registre presença e acesse os certificados emitidos."
      />

      <AppContainer className="py-7 sm:py-9">
        <Suspense fallback={<ConteudoCarregando />}>
          <ListaInscricoes searchParams={searchParams} />
        </Suspense>
      </AppContainer>
    </>
  );
}

async function ListaInscricoes({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await connection();

  const usuario = await obterUsuario();
  if (!usuario) {
    return (
      <AcessoRestrito variante="sessao" destinoLogin="/conta/inscricoes" />
    );
  }

  const params = await searchParams;
  const filtro = filtroValido(params.status);
  const inscricoes = await listarMinhasInscricoes();
  const agora = new Date();
  const agoraMs = agora.getTime();

  const contagens: Record<Filtro, number> = {
    todas: inscricoes.length,
    confirmada: inscricoes.filter((item) => item.status === "confirmada").length,
    lista_espera: inscricoes.filter((item) => item.status === "lista_espera")
      .length,
    cancelada: inscricoes.filter((item) => item.status === "cancelada").length,
  };

  const filtradas =
    filtro === "todas"
      ? inscricoes
      : inscricoes.filter((item) => item.status === filtro);

  const ordenadas = [...filtradas].sort((a, b) => {
    const aFim = a.evento ? new Date(a.evento.fim).getTime() : 0;
    const bFim = b.evento ? new Date(b.evento.fim).getTime() : 0;
    const aFuturo = aFim >= agoraMs;
    const bFuturo = bFim >= agoraMs;

    if (aFuturo !== bFuturo) return aFuturo ? -1 : 1;

    const aInicio = a.evento ? new Date(a.evento.inicio).getTime() : 0;
    const bInicio = b.evento ? new Date(b.evento.inicio).getTime() : 0;

    return aFuturo ? aInicio - bInicio : bInicio - aInicio;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-deep/10 bg-white p-1.5 shadow-sm">
        {ABAS.map((aba) => {
          const ativa = filtro === aba.valor;
          const href =
            aba.valor === "todas"
              ? "/conta/inscricoes"
              : `/conta/inscricoes?status=${aba.valor}`;

          return (
            <Link
              key={aba.valor}
              href={href}
              aria-current={ativa ? "page" : undefined}
              className={`inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick sm:flex-none sm:px-4 ${
                ativa
                  ? "bg-deep text-papaya shadow-sm"
                  : "text-muted hover:bg-papaya/50 hover:text-deep"
              }`}
            >
              <span className="sm:hidden">{aba.rotuloCurto}</span>
              <span className="hidden sm:inline">{aba.rotulo}</span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold ${
                  ativa ? "bg-papaya/15 text-papaya" : "bg-shell text-muted"
                }`}
              >
                {contagens[aba.valor]}
              </span>
            </Link>
          );
        })}
      </div>

      {inscricoes.length === 0 ? (
        <EstadoVazio
          icone={<IconeBilhete className="h-5 w-5" />}
          titulo="Você ainda não tem inscrições"
          descricao="Encontre um evento com inscrições abertas e garanta sua vaga. Suas inscrições aparecem aqui automaticamente."
          acao={
            <ButtonLink href="/conta/eventos" tamanho="sm">
              Ver agenda
            </ButtonLink>
          }
        />
      ) : ordenadas.length === 0 ? (
        <EstadoVazio
          icone={<IconeBilhete className="h-5 w-5" />}
          titulo="Nenhuma inscrição neste filtro"
          descricao="Troque de aba para ver outras inscrições ou explore a agenda para participar de um novo evento."
          acao={
            <ButtonLink
              href="/conta/inscricoes"
              variante="contorno"
              tamanho="sm"
            >
              Ver todas
            </ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-4">
          {ordenadas.map((inscricao) => (
            <ItemInscricao
              key={inscricao.id}
              inscricao={inscricao}
              agoraMs={agoraMs}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemInscricao({
  inscricao,
  agoraMs,
}: {
  inscricao: InscricaoDoUsuario;
  agoraMs: number;
}) {
  const evento = inscricao.evento;
  const iniciado = evento
    ? new Date(evento.inicio).getTime() <= agoraMs
    : true;
  const { dia, mes } = evento
    ? partesDaData(evento.inicio)
    : { dia: "--", mes: "---" };

  return (
    <li className="overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-papaya text-deep ring-1 ring-deep/10">
          <span className="font-display text-lg font-bold leading-none">
            {dia}
          </span>
          <span className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-brick">
            {mes}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${
                ESTILOS_STATUS[inscricao.status]
              }`}
            >
              {ROTULOS_STATUS[inscricao.status]}
            </span>

            {inscricao.presente ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-steel-300 bg-steel-50 px-2.5 py-1 text-[0.65rem] font-semibold text-deep">
                <IconeCheck className="h-3 w-3" />
                Presença registrada
              </span>
            ) : null}

            {inscricao.certificado?.status === "emitido" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-deep/15 bg-deep px-2.5 py-1 text-[0.65rem] font-semibold text-papaya">
                <IconeCertificado className="h-3 w-3" />
                Certificado emitido
              </span>
            ) : null}
          </div>

          {evento ? (
            <>
              <h2 className="mt-2.5 font-display text-lg font-semibold leading-snug text-deep">
                <Link
                  href={`/eventos/${evento.id}`}
                  className="underline-offset-4 transition-colors hover:text-brick hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                >
                  {evento.titulo}
                </Link>
              </h2>

              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
                <li className="inline-flex items-center gap-1.5">
                  <IconeRelogio className="h-3.5 w-3.5 text-steel-700" />
                  {formatarPeriodo(evento.inicio, evento.fim)}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  {evento.modalidade === "online" ? (
                    <IconeGlobo className="h-3.5 w-3.5 text-steel-700" />
                  ) : (
                    <IconeLocal className="h-3.5 w-3.5 text-steel-700" />
                  )}
                  {evento.local ?? ROTULOS_MODALIDADE[evento.modalidade]}
                </li>
              </ul>
            </>
          ) : (
            <h2 className="mt-2.5 text-sm font-semibold text-muted">
              Evento indisponível
            </h2>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
          {evento ? (
            <ButtonLink
              href={`/eventos/${evento.id}`}
              variante="contorno"
              tamanho="sm"
            >
              Ver evento
            </ButtonLink>
          ) : null}

          {inscricao.certificado?.status === "emitido" ? (
            <ButtonLink
              href={`/certificados/${inscricao.certificado.codigo}`}
              tamanho="sm"
            >
              <IconeCertificado className="h-4 w-4" />
              Certificado
            </ButtonLink>
          ) : null}
        </div>
      </div>

      {inscricao.status === "confirmada" && evento && !iniciado ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/70 px-4 py-3 sm:px-5">
          <p className="text-xs leading-relaxed text-muted">
            Inscrição feita em {formatarDataCurta(inscricao.dataInscricao)}.
          </p>
          <BotaoCancelarInscricao
            inscricaoId={inscricao.id}
            eventoId={evento.id}
          />
        </div>
      ) : null}

      {inscricao.status === "lista_espera" ? (
        <div className="border-t border-line bg-papaya/40 px-4 py-3 text-xs leading-relaxed text-molten sm:px-5">
          Você está na lista de espera. A organização entrará em contato caso
          uma vaga seja liberada.
        </div>
      ) : null}
    </li>
  );
}
