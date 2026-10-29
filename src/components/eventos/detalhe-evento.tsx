import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { CSSProperties, ReactNode } from "react";
import { AcoesInscricao } from "@/components/eventos/acoes-inscricao";
import { SeloModalidade, SeloStatus } from "@/components/eventos/selos";
import { AvisoPrevia } from "@/components/ui/aviso-previa";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import {
  IconeCalendario,
  IconeCapelo,
  IconeCheck,
  IconeGlobo,
  IconeInfo,
  IconeLocal,
  IconeUsuarios,
} from "@/components/ui/icons";
import {
  eventoRealizado,
  percentualOcupacao,
  ROTULOS_PUBLICO,
  ROTULOS_SITUACAO,
  rotuloTipo,
  situacaoInscricao,
  textoVagas,
} from "@/lib/evento-utils";
import {
  formatarDataExtensa,
  formatarDiaMes,
  formatarPeriodo,
  formatarPeriodoInscricoes,
} from "@/lib/format";
import { buscarEventoPublicado } from "@/lib/eventos";
import { obterContextoEvento } from "@/lib/inscricoes/consultas";
import { estiloTemaEvento, obterTemaEvento } from "@/lib/tema-evento";
import type {
  Evento,
  Modalidade,
  SituacaoInscricao,
} from "@/types/evento";

const gradientes: Record<Modalidade, string> = {
  presencial: "from-deep via-navy-800 to-steel-700",
  online: "from-steel-700 via-navy-800 to-deep",
  hibrida: "from-molten via-brick to-deep",
};

const estilosSituacao: Record<SituacaoInscricao, string> = {
  aberta: "border-steel-300 bg-steel-50 text-deep",
  "em-breve": "border-brick/30 bg-papaya text-molten",
  encerrada: "border-line bg-shell text-ink",
  lotado: "border-ember-300 bg-ember-50 text-molten",
};

function mensagemSituacao(evento: Evento, situacao: SituacaoInscricao) {
  switch (situacao) {
    case "aberta":
      return evento.inscricoesFim
        ? `As inscrições estão abertas até ${formatarDiaMes(evento.inscricoesFim)}. Garanta sua vaga.`
        : "As inscrições estão abertas. Garanta sua vaga.";
    case "em-breve":
      return evento.inscricoesInicio
        ? `As inscrições abrem em ${formatarDiaMes(evento.inscricoesInicio)}.`
        : "As inscrições abrirão em breve.";
    case "lotado":
      return "Todas as vagas foram preenchidas. Acompanhe a agenda para novas oportunidades.";
    case "encerrada":
      return "O período de inscrições foi encerrado.";
  }
}

function Secao({
  titulo,
  children,
  className = "",
}: {
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`tema-cartao rounded-2xl border border-deep/10 bg-white p-6 shadow-sm sm:p-8 ${className}`}
    >
      <h2 className="flex items-center gap-3 font-display text-xl font-semibold tracking-tight text-deep">
      <span className="tema-marcador h-5 w-1 rounded-full bg-brick" aria-hidden="true" />
        {titulo}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LinhaResumo({
  icone: Icone,
  rotulo,
  children,
}: {
  icone: typeof IconeCalendario;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="tema-icone mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-papaya text-steel-700 ring-1 ring-deep/10">
        <Icone className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
          {rotulo}
        </dt>
        <dd className="mt-1 text-sm leading-relaxed text-ink">{children}</dd>
      </div>
    </div>
  );
}

function ErroDetalhe() {
  return (
    <main className="flex-1 bg-canvas">
      <Container className="py-20">
        <div className="mx-auto max-w-lg rounded-2xl border border-ember-300/70 bg-ember-50 p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-molten ring-1 ring-ember-200">
            <IconeInfo className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-molten">
            Não foi possível carregar este evento
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ember-700">
            Tente novamente em alguns instantes. Se o problema continuar,
            procure a organização.
          </p>
          <ButtonLink
            href="/eventos"
            variante="contorno"
            className="mt-6"
          >
            Voltar para a agenda
          </ButtonLink>
        </div>
      </Container>
    </main>
  );
}

export async function DetalheEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connection();

  const { evento, erro, demonstracao } = await buscarEventoPublicado(id);

  if (erro) return <ErroDetalhe />;
  if (!evento) notFound();

  const contexto = await obterContextoEvento(evento.id);
  const agora = new Date();
  const situacao = situacaoInscricao(evento, agora);
  const realizado = eventoRealizado(evento, agora);
  const eventoIniciado = new Date(evento.inicio).getTime() <= agora.getTime();
  const ocupacao = percentualOcupacao(evento);
  const paragrafos = evento.descricao
    .split(/\n{2,}/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean);

  const cursos = evento.cursosPermitidos?.length
    ? evento.cursosPermitidos.join(", ")
    : "Todos os cursos";
  const series = evento.seriesPermitidas?.length
    ? evento.seriesPermitidas.join(", ")
    : "Todas as séries";

  const localPrincipal =
    evento.modalidade === "online"
      ? "Evento online"
      : (evento.local ?? "Local a confirmar");
  const complementoLocal =
    evento.modalidade === "online"
      ? "O link de acesso será enviado após a inscrição."
      : evento.modalidade === "hibrida"
        ? "Também haverá transmissão online para inscritos."
        : null;
  const tema = obterTemaEvento(evento.corTema);

  return (
    <div className="tema-evento" style={estiloTemaEvento(tema) as CSSProperties}>
      <header className="tema-cabecalho relative overflow-hidden border-b border-line bg-papaya">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full border border-brick/15" />
        <div className="pointer-events-none absolute -right-10 -top-6 h-48 w-48 rounded-full border border-steel/25" />

        <Container className="relative py-10 sm:py-14">
          <nav
            aria-label="Trilha de navegação"
            className="flex flex-wrap items-center gap-2 text-xs text-muted"
          >
            <Link
              href="/"
              className="transition-colors hover:text-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Início
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/eventos"
              className="transition-colors hover:text-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Eventos
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-deep">Detalhes</span>
          </nav>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <SeloStatus situacao={situacao} realizado={realizado} />
            <SeloModalidade modalidade={evento.modalidade} />
            <span className="rounded-full border border-deep/15 bg-white/70 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-deep">
              {rotuloTipo(evento.tipo)}
            </span>
          </div>

          <h1 className="mt-5 max-w-4xl text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-deep sm:text-4xl lg:text-5xl">
            {evento.titulo}
          </h1>

          <div className="mt-6 flex flex-col gap-3 text-sm font-medium text-ink sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
            <span className="inline-flex items-center gap-2">
              <IconeCalendario className="h-4 w-4 text-steel-700" />
              {formatarPeriodo(evento.inicio, evento.fim)}
            </span>
            <span className="inline-flex items-center gap-2">
              {evento.modalidade === "online" ? (
                <IconeGlobo className="h-4 w-4 text-steel-700" />
              ) : (
                <IconeLocal className="h-4 w-4 text-steel-700" />
              )}
              {localPrincipal}
            </span>
          </div>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-12 sm:py-16">
        <Container>
          {demonstracao ? <AvisoPrevia className="mb-6" /> : null}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div className="space-y-6">
              {evento.imagemUrl ? (
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-deep/10 bg-deep shadow-sm">
                  <Image
                    src={evento.imagemUrl}
                    alt={`Imagem de divulgação do evento ${evento.titulo}`}
                    fill
                    unoptimized={evento.imagemUrl.startsWith("http")}
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                    preload
                  />
                </div>
              ) : null}

              <Secao titulo="Sobre o evento">
                {paragrafos.length > 0 ? (
                  <div className="space-y-4 text-[0.98rem] leading-relaxed text-ink">
                    {paragrafos.map((paragrafo) => (
                      <p key={paragrafo}>{paragrafo}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted">
                    Mais informações sobre este evento serão divulgadas em
                    breve.
                  </p>
                )}
              </Secao>

              <Secao titulo="Quem pode participar">
                <dl className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <dt className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                      <IconeUsuarios className="h-3.5 w-3.5 text-steel-700" />
                      Público-alvo
                    </dt>
                    <dd className="mt-1.5 text-sm font-semibold text-deep">
                      {ROTULOS_PUBLICO[evento.publicoAlvo]}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <dt className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                      <IconeCapelo className="h-3.5 w-3.5 text-steel-700" />
                      Cursos
                    </dt>
                    <dd className="mt-1.5 text-sm font-semibold text-deep">
                      {cursos}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <dt className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                      <IconeCalendario className="h-3.5 w-3.5 text-steel-700" />
                      Séries
                    </dt>
                    <dd className="mt-1.5 text-sm font-semibold text-deep">
                      {series}
                    </dd>
                  </div>
                </dl>
              </Secao>

              <Secao titulo="Inscrições">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                      Período de inscrições
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-deep">
                      {formatarPeriodoInscricoes(
                        evento.inscricoesInicio,
                        evento.inscricoesFim,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-canvas p-4">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                      Vagas
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-deep">
                      {evento.limiteVagas !== null
                        ? `${evento.limiteVagas} vagas`
                        : "Conforme organização"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {textoVagas(evento)}
                    </p>
                  </div>
                </div>

                {ocupacao !== null &&
                evento.limiteVagas !== null &&
                evento.inscritos !== null ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-medium text-muted">
                      <span>{evento.inscritos} inscritos</span>
                      <span>{evento.limiteVagas} vagas</span>
                    </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-deep/10">
                      <div
                        className="tema-progresso h-full rounded-full bg-brick"
                        style={{ width: `${ocupacao}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div
                  className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${estilosSituacao[situacao]}`}
                >
                  <IconeInfo className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{mensagemSituacao(evento, situacao)}</p>
                </div>
              </Secao>

              <Secao titulo="Informações importantes">
                <ul className="space-y-3">
                  {[
                    "A inscrição é pessoal e intransferível.",
                    "O certificado é emitido após a confirmação de presença, conforme as regras do evento.",
                    "Cancelamentos e correções seguem o período e as orientações da organização.",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-ink"
                    >
                      <IconeCheck className="tema-check mt-0.5 h-4 w-4 shrink-0 text-brick" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Secao>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-suave">
                <div
                  className={`tema-faixa h-1.5 bg-gradient-to-r ${gradientes[evento.modalidade]}`}
                />
                <div className="p-6">
                  <h2 className="font-display text-lg font-semibold tracking-tight text-deep">
                    Resumo do evento
                  </h2>

                  <dl className="mt-5 space-y-5">
                    <LinhaResumo icone={IconeCalendario} rotulo="Data e horário">
                      <p className="font-semibold text-deep">
                        {formatarDataExtensa(evento.inicio)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatarPeriodo(evento.inicio, evento.fim)}
                      </p>
                    </LinhaResumo>

                    <LinhaResumo
                      icone={
                        evento.modalidade === "online" ? IconeGlobo : IconeLocal
                      }
                      rotulo={
                        evento.modalidade === "online"
                          ? "Onde acontece"
                          : "Local"
                      }
                    >
                      <p className="font-semibold text-deep">
                        {localPrincipal}
                      </p>
                      {complementoLocal ? (
                        <p className="mt-0.5 text-xs text-muted">
                          {complementoLocal}
                        </p>
                      ) : null}
                    </LinhaResumo>

                    <LinhaResumo icone={IconeCalendario} rotulo="Inscrições">
                      {formatarPeriodoInscricoes(
                        evento.inscricoesInicio,
                        evento.inscricoesFim,
                      )}
                    </LinhaResumo>

                    <LinhaResumo icone={IconeUsuarios} rotulo="Vagas">
                      {textoVagas(evento)}
                    </LinhaResumo>
                  </dl>

                  <div className="tema-inscricao mt-6 border-t border-line pt-6">
                    {!realizado &&
                    (situacao === "aberta" ||
                      contexto.inscricao?.status === "confirmada") ? (
                      <AcoesInscricao
                        eventoId={evento.id}
                        situacao={situacao}
                        autenticado={contexto.autenticado}
                        inscricao={contexto.inscricao}
                        linkAcesso={contexto.linkAcesso}
                        eventoIniciado={eventoIniciado}
                        destinoLogin={`/eventos/${evento.id}`}
                      />
                    ) : (
                      <span className="flex h-12 w-full items-center justify-center rounded-full bg-deep/[0.06] px-4 text-sm font-semibold text-muted">
                        {realizado
                          ? "Evento realizado"
                          : ROTULOS_SITUACAO[situacao]}
                      </span>
                    )}

                    <p className="mt-3 text-center text-xs leading-relaxed text-muted">
                      {contexto.autenticado
                        ? "Sua inscrição é pessoal e está sujeita às regras e ao limite de vagas do evento."
                        : "A inscrição exige uma conta no Partiu DPM e está sujeita às regras e ao limite de vagas do evento."}
                    </p>
                  </div>
                </div>
              </div>

              <ButtonLink
                href="/eventos"
                variante="contorno"
                className="w-full"
              >
                Voltar para a agenda
              </ButtonLink>
            </aside>
          </div>
        </Container>
      </main>
    </div>
  );
}
