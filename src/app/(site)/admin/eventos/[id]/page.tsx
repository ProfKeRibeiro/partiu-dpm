import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { BotaoExcluirEvento } from "@/components/admin/botao-excluir-evento";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import {
  IconeCalendario,
  IconeCertificado,
  IconeCheck,
  IconeSetaDiagonal,
  IconeUsuarios,
} from "@/components/ui/icons";
import {
  cancelarCertificado,
  definirPresenca,
  definirStatusInscricao,
  emitirCertificado,
} from "@/lib/admin/acoes";
import { publicarEvento } from "@/lib/admin/eventos-acoes";
import {
  listarInscricoesAdmin,
  obterEventoAdmin,
  obterEventoParaEdicao,
} from "@/lib/admin/consultas";
import { usuarioEhAdmin } from "@/lib/auth/sessao";
import { isSupabaseConfigured } from "@/lib/env";
import { formatarDataCurta, formatarPeriodo } from "@/lib/format";

export const metadata: Metadata = {
  title: "Gerenciar inscrições",
  robots: { index: false, follow: false },
};

export const instant = false;

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROTULOS_CATEGORIA: Record<string, string> = {
  aluno: "Aluno",
  servidor: "Servidor",
  externo: "Externo",
  outro: "Outro",
};

export default function AdminEventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publicado?: string; erro?: string }>;
}) {
  return (
    <Suspense fallback={<AdminEventoCarregando />}>
      <AdminEventoConteudo params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function AdminEventoCarregando() {
  return (
    <main className="flex-1 bg-canvas py-10 sm:py-12">
      <Container>
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-4 w-40 animate-pulse rounded bg-deep/10" />
          <div className="h-10 w-2/3 animate-pulse rounded bg-deep/10" />
          <div className="h-40 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
      </Container>
    </main>
  );
}

async function AdminEventoConteudo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publicado?: string; erro?: string }>;
}) {
  await connection();

  if (!isSupabaseConfigured) {
    return (
      <main className="flex-1 bg-canvas py-20">
        <Container>
          <div className="mx-auto max-w-xl rounded-2xl border border-ember-400/40 bg-ember-50 p-8">
            <h1 className="font-display text-2xl font-semibold text-molten">
              Supabase não configurado
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ember-700">
              Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no{" "}
              <code>.env.local</code> para gerenciar inscrições.
            </p>
          </div>
        </Container>
      </main>
    );
  }

  if (!(await usuarioEhAdmin())) {
    return <AcessoRestrito variante="admin" destinoLogin="/admin" />;
  }

  const { id } = await params;

  if (!REGEX_UUID.test(id)) notFound();

  const evento = await obterEventoAdmin(id);

  if (!evento) notFound();

  const detalhes = await obterEventoParaEdicao(id);
  if (!detalhes) notFound();

  const consulta = await searchParams;

  const inscricoes = await listarInscricoesAdmin(evento.id);

  const confirmadas = inscricoes.filter(
    (inscricao) => inscricao.status === "confirmada",
  ).length;
  const presentes = inscricoes.filter(
    (inscricao) => inscricao.presente,
  ).length;
  const certificados = inscricoes.filter(
    (inscricao) => inscricao.certificadoStatus === "emitido",
  ).length;

  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-papaya">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div className="pointer-events-none absolute -right-20 -top-14 h-56 w-56 rounded-full border border-steel/25" />

        <Container className="relative py-9 sm:py-12">
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
              href="/admin"
              className="transition-colors hover:text-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Administração
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-deep">Inscrições</span>
          </nav>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-deep/15 bg-white/70 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-deep">
                {evento.status}
              </span>
              <h1 className="mt-3 max-w-3xl text-balance font-display text-2xl font-semibold tracking-tight text-deep sm:text-3xl">
                {evento.titulo}
              </h1>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-ink">
                <IconeCalendario className="h-4 w-4 text-steel-700" />
                {formatarPeriodo(evento.inicio, evento.fim)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ButtonLink
                href={`/admin/eventos/${evento.id}/editar`}
                variante="primario"
                tamanho="sm"
              >
                Editar evento
              </ButtonLink>
              <BotaoExcluirEvento eventoId={evento.id} />
              <ButtonLink
                href={`/eventos/${evento.id}`}
                variante="contorno"
                tamanho="sm"
              >
                Ver página pública
                <IconeSetaDiagonal className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/admin" variante="fantasma" tamanho="sm">
                Voltar ao painel
              </ButtonLink>
            </div>
          </div>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-10 sm:py-12">
        <Container>
          {consulta.publicado === "1" ? (
            <p role="status" className="mb-6 rounded-xl border border-steel-300 bg-steel-50 px-4 py-3 text-sm font-medium text-deep">
              Evento publicado e disponível na agenda pública.
            </p>
          ) : null}
          {consulta.erro === "publicar" ? (
            <p role="alert" className="mb-6 rounded-xl border border-ember-300 bg-ember-50 px-4 py-3 text-sm font-medium text-molten">
              Não foi possível publicar. Para eventos online ou híbridos, revise o link de acesso na edição.
            </p>
          ) : null}
          {consulta.erro === "excluir" ? (
            <p role="alert" className="mb-6 rounded-xl border border-ember-300 bg-ember-50 px-4 py-3 text-sm font-medium text-molten">
              Não foi possível excluir o evento. Tente novamente.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { rotulo: "Inscrições", valor: inscricoes.length },
              { rotulo: "Confirmadas", valor: confirmadas },
              { rotulo: "Presenças", valor: presentes },
              { rotulo: "Certificados", valor: certificados },
            ].map((indicador) => (
              <div
                key={indicador.rotulo}
                className="rounded-2xl border border-deep/10 bg-white px-5 py-4 shadow-sm"
              >
                <p className="font-display text-2xl font-semibold text-deep">
                  {indicador.valor}
                </p>
                <p className="text-xs text-muted">{indicador.rotulo}</p>
              </div>
            ))}
          </div>

          <section className="mt-8 rounded-2xl border border-deep/10 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-deep">
                Publicação
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {evento.status === "publicado"
                  ? "Este evento já está visível na agenda pública."
                  : "Publique quando todos os dados estiverem prontos para divulgação."}
              </p>
            </div>
            {evento.status === "publicado" ? (
              <span className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-steel-50 px-4 text-sm font-semibold text-deep sm:mt-0">
                Evento publicado
              </span>
            ) : evento.status === "rascunho" ? (
              <form action={publicarEvento} className="mt-4 sm:mt-0">
                <input type="hidden" name="evento_id" value={evento.id} />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-brick px-4 text-sm font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                >
                  Publicar evento
                </button>
              </form>
            ) : (
              <span className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-shell px-4 text-sm font-semibold text-muted sm:mt-0">
                Status: {evento.status}
              </span>
            )}
          </section>

          <section className="mt-8 rounded-2xl border border-deep/10 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-deep">
                  Informações do evento
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Confira os dados publicados e use a edição para atualizá-los.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-deep/10 bg-white px-3 py-1.5 text-xs font-semibold text-deep">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "var(--color-steel-700)" }} />
                Tema: {detalhes.corTema}
              </span>
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-canvas p-4"><dt className="text-xs font-medium text-muted">Tipo</dt><dd className="mt-1 font-semibold capitalize text-deep">{detalhes.tipo}</dd></div>
              <div className="rounded-xl bg-canvas p-4"><dt className="text-xs font-medium text-muted">Modalidade</dt><dd className="mt-1 font-semibold capitalize text-deep">{detalhes.modalidade}</dd></div>
              <div className="rounded-xl bg-canvas p-4"><dt className="text-xs font-medium text-muted">Público</dt><dd className="mt-1 font-semibold capitalize text-deep">{detalhes.publicoAlvo}</dd></div>
              <div className="rounded-xl bg-canvas p-4"><dt className="text-xs font-medium text-muted">Local</dt><dd className="mt-1 font-semibold text-deep">{detalhes.local ?? "Online"}</dd></div>
              <div className="rounded-xl bg-canvas p-4"><dt className="text-xs font-medium text-muted">Vagas</dt><dd className="mt-1 font-semibold text-deep">{detalhes.limiteVagas ?? "Ilimitadas"}</dd></div>
              <div className="rounded-xl bg-canvas p-4"><dt className="text-xs font-medium text-muted">Imagem de capa</dt><dd className="mt-1 break-all font-semibold text-deep">{detalhes.imagemUrl ? "Configurada" : "Não configurada"}</dd></div>
            </dl>

            <div className="mt-5 border-t border-line pt-5">
              <h3 className="text-sm font-semibold text-deep">Descrição</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
                {detalhes.descricao || "Nenhuma descrição cadastrada."}
              </p>
            </div>
          </section>

          <section
            id="presencas"
            className="mt-8 scroll-mt-6 overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <h2 className="font-display text-lg font-semibold tracking-tight text-deep">
                Inscritos
              </h2>
              <p className="text-xs text-muted">
                Presença e certificado são registrados por inscrição.
              </p>
            </div>

            {inscricoes.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-papaya text-steel-700 ring-1 ring-deep/10">
                  <IconeUsuarios className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm font-semibold text-deep">
                  Nenhuma inscrição neste evento.
                </p>
                <p className="mt-1 text-sm text-muted">
                  As inscrições aparecem aqui assim que os participantes se
                  cadastrarem.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-canvas text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Participante
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        Perfil
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        Inscrição
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        Presença
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Certificado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {inscricoes.map((inscricao) => (
                      <tr key={inscricao.inscricaoId} className="align-top">
                        <td className="max-w-[260px] px-5 py-4">
                          <span className="block font-medium text-deep">
                            {inscricao.nomeCompleto}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {inscricao.email ?? "sem e-mail"}
                          </span>
                          <span className="mt-1 block text-[0.7rem] text-muted">
                            Inscrição em{" "}
                            {formatarDataCurta(inscricao.dataInscricao)}
                          </span>
                        </td>

                        <td className="max-w-[200px] px-3 py-4 text-xs leading-relaxed text-ink">
                          <span className="block font-semibold text-deep">
                            {ROTULOS_CATEGORIA[inscricao.categoria] ??
                              inscricao.categoria}
                          </span>
                          {inscricao.curso ? (
                            <span className="block">{inscricao.curso}</span>
                          ) : null}
                          {inscricao.anoSerie ? (
                            <span className="block">{inscricao.anoSerie}</span>
                          ) : null}
                          {inscricao.instituicao ? (
                            <span className="block text-muted">
                              {inscricao.instituicao}
                            </span>
                          ) : null}
                        </td>

                        <td className="px-3 py-4">
                          <form
                            action={definirStatusInscricao}
                            className="flex flex-col gap-2"
                          >
                            <input
                              type="hidden"
                              name="inscricao_id"
                              value={inscricao.inscricaoId}
                            />
                            <input
                              type="hidden"
                              name="evento_id"
                              value={evento.id}
                            />
                            <select
                              name="status"
                              defaultValue={inscricao.status}
                              aria-label={`Status da inscrição de ${inscricao.nomeCompleto}`}
                              className="w-full rounded-lg border border-deep/15 bg-white px-2.5 py-1.5 text-xs text-deep outline-none focus:border-brick focus:ring-2 focus:ring-brick/15"
                            >
                              <option value="confirmada">Confirmada</option>
                              <option value="lista_espera">Lista de espera</option>
                              <option value="cancelada">Cancelada</option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-full border border-deep/20 bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-deep transition-colors hover:border-deep/35 hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                            >
                              Atualizar
                            </button>
                          </form>
                        </td>

                        <td className="px-3 py-4">
                          <form action={definirPresenca}>
                            <input
                              type="hidden"
                              name="inscricao_id"
                              value={inscricao.inscricaoId}
                            />
                            <input
                              type="hidden"
                              name="evento_id"
                              value={evento.id}
                            />
                            <input
                              type="hidden"
                              name="presente"
                              value={inscricao.presente ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
                                inscricao.presente
                                  ? "border border-steel-300 bg-steel-50 text-deep hover:bg-steel-100"
                                  : "border border-deep/20 bg-white text-deep hover:bg-papaya/60"
                              }`}
                            >
                              {inscricao.presente ? (
                                <>
                                  <IconeCheck className="h-3.5 w-3.5 text-steel-700" />
                                  Presente
                                </>
                              ) : (
                                "Marcar presença"
                              )}
                            </button>
                            {inscricao.dataPresenca ? (
                              <span className="mt-1 block text-[0.65rem] text-muted">
                                {formatarDataCurta(inscricao.dataPresenca)}
                              </span>
                            ) : null}
                          </form>
                        </td>

                        <td className="px-5 py-4">
                          {inscricao.certificadoStatus === "emitido" &&
                          inscricao.certificadoCodigo ? (
                            <div className="space-y-2">
                              <Link
                                href={`/certificados/${inscricao.certificadoCodigo}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-deep underline-offset-4 hover:text-brick hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                              >
                                <IconeCertificado className="h-3.5 w-3.5 text-steel-700" />
                                Ver certificado
                              </Link>
                              <form action={cancelarCertificado}>
                                <input
                                  type="hidden"
                                  name="inscricao_id"
                                  value={inscricao.inscricaoId}
                                />
                                <input
                                  type="hidden"
                                  name="evento_id"
                                  value={evento.id}
                                />
                                <button
                                  type="submit"
                                  className="text-[0.68rem] font-medium text-brick underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                                >
                                  Cancelar certificado
                                </button>
                              </form>
                            </div>
                          ) : inscricao.presente ? (
                            <form action={emitirCertificado}>
                              <input
                                type="hidden"
                                name="inscricao_id"
                                value={inscricao.inscricaoId}
                              />
                              <input
                                type="hidden"
                                name="evento_id"
                                value={evento.id}
                              />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 rounded-full bg-deep px-3 py-1.5 text-[0.7rem] font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                              >
                                <IconeCertificado className="h-3.5 w-3.5" />
                                Emitir certificado
                              </button>
                            </form>
                          ) : (
                            <span className="text-[0.7rem] leading-relaxed text-muted">
                              Registre a presença para emitir.
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Ações administrativas são validadas no banco por <code>eh_admin()</code>.
            Alterar o status de uma inscrição atualiza o contador público de
            vagas.
          </p>
        </Container>
      </main>
    </>
  );
}
