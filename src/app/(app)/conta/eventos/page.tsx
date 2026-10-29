import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { CabecalhoApp } from "@/components/app/cabecalho";
import { AppContainer } from "@/components/app/container";
import { CartaoEventoApp } from "@/components/app/cartao-evento";
import {
  AvisoApp,
  ConteudoCarregando,
  EstadoVazio,
} from "@/components/app/estados";
import { ButtonLink } from "@/components/ui/button-link";
import {
  IconeBusca,
  IconeCalendario,
  IconeSetaDireita,
} from "@/components/ui/icons";
import { hrefComParams } from "@/lib/app-utils";
import { obterUsuario } from "@/lib/auth/sessao";
import {
  eventoRealizado,
  ROTULOS_MODALIDADE,
  rotuloTipo,
} from "@/lib/evento-utils";
import { listarEventosPublicados } from "@/lib/eventos";
import { listarMinhasInscricoes } from "@/lib/inscricoes/consultas";
import type { Modalidade } from "@/types/evento";

export const metadata: Metadata = {
  title: "Eventos",
  description:
    "Explore os eventos publicados pelo Partiu DPM e faça sua inscrição.",
};

export const instant = false;

type Parametros = {
  q?: string;
  tipo?: string;
  modalidade?: string;
  pagina?: string;
};

const POR_PAGINA = 9;
const MODALIDADES_VALIDAS: Modalidade[] = ["presencial", "online", "hibrida"];

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function EventosPage({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  return (
    <>
      <CabecalhoApp
        eyebrow="Agenda"
        titulo="Eventos"
        descricao="Palestras, oficinas, cursos e encontros da comunidade DPM. Escolha um evento e garanta sua vaga."
      />

      <AppContainer className="py-7 sm:py-9">
        <Suspense fallback={<ConteudoCarregando />}>
          <ListaEventos searchParams={searchParams} />
        </Suspense>
      </AppContainer>
    </>
  );
}

async function ListaEventos({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  await connection();

  const usuario = await obterUsuario();
  if (!usuario) {
    return <AcessoRestrito variante="sessao" destinoLogin="/conta/eventos" />;
  }

  const params = await searchParams;
  const [agenda, inscricoes] = await Promise.all([
    listarEventosPublicados(),
    listarMinhasInscricoes(),
  ]);

  const q = (params.q ?? "").trim().slice(0, 100);
  const tipoBruto = (params.tipo ?? "").trim().toLowerCase();
  const modalidadeBruta = (params.modalidade ?? "").trim() as Modalidade;
  const modalidade = MODALIDADES_VALIDAS.includes(modalidadeBruta)
    ? modalidadeBruta
    : "";

  const tiposDisponiveis = Array.from(
    new Set(
      agenda.eventos
        .map((evento) => evento.tipo.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).sort();

  const tipo = tiposDisponiveis.includes(tipoBruto) ? tipoBruto : "";
  const termo = normalizar(q);

  const inscritos = new Set(
    inscricoes
      .filter((inscricao) => inscricao.status === "confirmada")
      .map((inscricao) => inscricao.evento?.id)
      .filter((id): id is string => Boolean(id)),
  );

  const agora = new Date();
  const filtrados = agenda.eventos
    .filter((evento) => {
      if (tipo && evento.tipo.trim().toLowerCase() !== tipo) return false;
      if (modalidade && evento.modalidade !== modalidade) return false;

      if (termo) {
        const texto = normalizar(
          [
            evento.titulo,
            evento.descricao,
            evento.tipo,
            evento.local ?? "",
            rotuloTipo(evento.tipo),
          ].join(" "),
        );

        if (!texto.includes(termo)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aRealizado = eventoRealizado(a, agora);
      const bRealizado = eventoRealizado(b, agora);

      if (aRealizado !== bRealizado) return aRealizado ? 1 : -1;

      const diferenca =
        new Date(a.inicio).getTime() - new Date(b.inicio).getTime();

      return aRealizado ? -diferenca : diferenca;
    });

  const totalPaginas = Math.max(
    1,
    Math.ceil(filtrados.length / POR_PAGINA),
  );
  const paginaInformada = Number.parseInt(params.pagina ?? "1", 10);
  const pagina = Math.min(
    Math.max(Number.isFinite(paginaInformada) ? paginaInformada : 1, 1),
    totalPaginas,
  );
  const visiveis = filtrados.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  );

  const temFiltro = Boolean(q || tipo || modalidade);
  const parametrosFiltro = { q, tipo, modalidade };

  return (
    <div className="space-y-6">
      <form
        action="/conta/eventos"
        method="get"
        className="grid gap-3 rounded-2xl border border-deep/10 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_180px_170px_auto] md:items-end"
      >
        <div>
          <label
            htmlFor="filtro-q"
            className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-deep"
          >
            Buscar
          </label>
          <div className="relative">
            <IconeBusca className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-700" />
            <input
              id="filtro-q"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Nome, tipo ou local"
              className="h-11 w-full rounded-xl border border-deep/15 bg-white pl-10 pr-3 text-sm text-deep outline-none transition-colors placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="filtro-tipo"
            className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-deep"
          >
            Tipo
          </label>
          <select
            id="filtro-tipo"
            name="tipo"
            defaultValue={tipo}
            className="h-11 w-full rounded-xl border border-deep/15 bg-white px-3 text-sm text-deep outline-none transition-colors focus:border-brick focus:ring-4 focus:ring-brick/10"
          >
            <option value="">Todos os tipos</option>
            {tiposDisponiveis.map((valor) => (
              <option key={valor} value={valor}>
                {rotuloTipo(valor)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filtro-modalidade"
            className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-deep"
          >
            Modalidade
          </label>
          <select
            id="filtro-modalidade"
            name="modalidade"
            defaultValue={modalidade}
            className="h-11 w-full rounded-xl border border-deep/15 bg-white px-3 text-sm text-deep outline-none transition-colors focus:border-brick focus:ring-4 focus:ring-brick/10"
          >
            <option value="">Todas</option>
            {MODALIDADES_VALIDAS.map((valor) => (
              <option key={valor} value={valor}>
                {ROTULOS_MODALIDADE[valor]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current md:flex-none"
          >
            Filtrar
          </button>
          {temFiltro ? (
            <Link
              href="/conta/eventos"
              className="inline-flex h-11 items-center justify-center rounded-full border border-deep/15 px-3 text-sm font-semibold text-muted transition-colors hover:border-deep/30 hover:text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Limpar
            </Link>
          ) : null}
        </div>
      </form>

      {agenda.erro ? (
        <AvisoApp tom="alerta">
          Não foi possível carregar a agenda agora. Tente recarregar a página em
          instantes.
        </AvisoApp>
      ) : null}

      {!agenda.erro && agenda.eventos.length === 0 ? (
        <EstadoVazio
          icone={<IconeCalendario className="h-5 w-5" />}
          titulo="Nenhum evento publicado no momento"
          descricao="A agenda está sendo preparada. Volte em breve para conferir os próximos encontros da comunidade DPM."
          acao={
            <ButtonLink href="/conta" variante="contorno" tamanho="sm">
              Ir para o painel
            </ButtonLink>
          }
        />
      ) : null}

      {agenda.eventos.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {filtrados.length === 0
                ? "Nenhum evento encontrado"
                : `${filtrados.length} ${
                    filtrados.length === 1 ? "evento" : "eventos"
                  } ${temFiltro ? "com os filtros aplicados" : "publicados"}`}
            </p>
            <p className="text-xs text-muted">
              {pagina} de {totalPaginas}
            </p>
          </div>

          {filtrados.length === 0 ? (
            <EstadoVazio
              icone={<IconeBusca className="h-5 w-5" />}
              titulo="Nenhum evento com esses filtros"
              descricao="Tente outro termo de busca ou remova os filtros para ver a agenda completa."
              acao={
                <ButtonLink
                  href="/conta/eventos"
                  variante="contorno"
                  tamanho="sm"
                >
                  Limpar filtros
                </ButtonLink>
              }
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visiveis.map((evento) => (
                  <CartaoEventoApp
                    key={evento.id}
                    evento={evento}
                    inscrito={inscritos.has(evento.id)}
                  />
                ))}
              </div>

              {totalPaginas > 1 ? (
                <nav
                  aria-label="Paginação de eventos"
                  className="flex flex-wrap items-center justify-center gap-2 pt-2"
                >
                  {pagina > 1 ? (
                    <Link
                      href={hrefComParams(
                        "/conta/eventos",
                        parametrosFiltro,
                        pagina - 1,
                      )}
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-deep/15 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    >
                      Anterior
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center rounded-full border border-line px-4 text-xs font-semibold text-muted/60">
                      Anterior
                    </span>
                  )}

                  {Array.from({ length: totalPaginas }, (_, indice) => {
                    const numero = indice + 1;

                    return (
                      <Link
                        key={numero}
                        href={hrefComParams(
                          "/conta/eventos",
                          parametrosFiltro,
                          numero,
                        )}
                        aria-current={numero === pagina ? "page" : undefined}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick ${
                          numero === pagina
                            ? "bg-deep text-papaya"
                            : "border border-deep/15 bg-white text-deep hover:bg-papaya/60"
                        }`}
                      >
                        {numero}
                      </Link>
                    );
                  })}

                  {pagina < totalPaginas ? (
                    <Link
                      href={hrefComParams(
                        "/conta/eventos",
                        parametrosFiltro,
                        pagina + 1,
                      )}
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-deep/15 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    >
                      Próxima
                      <IconeSetaDireita className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center rounded-full border border-line px-4 text-xs font-semibold text-muted/60">
                      Próxima
                    </span>
                  )}
                </nav>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
