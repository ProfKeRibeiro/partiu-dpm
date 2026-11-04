import type { Metadata } from "next";
import Link from "next/link";
import { cadastrarParticipanteSorteio } from "@/lib/sorteios/acoes";
import {
  consultarParticipanteSorteio,
  consultarResultadoSorteio,
} from "@/lib/sorteios/consultas";
import { Container } from "@/components/ui/container";
import { formatarDataHora } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sorteio",
  robots: { index: false, follow: false },
};

export const instant = false;

const ERROS: Record<string, string> = {
  participante_duplicado: "Este e-mail já está cadastrado neste sorteio.",
  nome_invalido: "Informe um nome entre 3 e 120 caracteres.",
  email_invalido: "Informe um e-mail válido.",
  email_responsavel_invalido: "Informe um e-mail válido para o responsável.",
  sorteio_encerrado: "Este sorteio não está mais aberto para cadastro.",
  evento_indisponivel: "O evento não está disponível.",
  erro: "Não foi possível concluir o cadastro. Tente novamente.",
};

const STATUS_PARTICIPANTE: Record<string, string> = {
  elegivel: "Você está elegível e participará do sorteio.",
  aguardando_responsavel:
    "Falta a autorização do responsável. Enviamos um link para o e-mail informado.",
  inelegivel: "O consentimento não foi autorizado; você não participará do sorteio.",
};

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-sm text-deep outline-none transition focus:border-brick focus:ring-4 focus:ring-brick/10";
const rotulo = "block text-sm font-semibold text-deep";

export default async function SorteioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ participante?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { participante, erro } = await searchParams;
  const sorteio = await consultarResultadoSorteio(id).catch(() => null);
  const statusParticipante = participante
    ? await consultarParticipanteSorteio(participante).catch(() => null)
    : null;
  const avisoErro = erro ? (ERROS[erro] ?? ERROS.erro) : null;

  return (
    <main className="flex-1 bg-canvas py-12 sm:py-16">
      <Container>
        <section className="mx-auto max-w-2xl rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-8">
          <div className="h-1.5 w-14 rounded-full bg-brick" />
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep sm:text-3xl">
            {sorteio?.nome ?? "Sorteio"}
          </h1>

          {!sorteio ? (
            <p className="mt-3 text-sm leading-relaxed text-ink">
              Sorteio não encontrado ou indisponível.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                {sorteio.evento.titulo}
                {sorteio.evento.dataInicio
                  ? ` — ${formatarDataHora(sorteio.evento.dataInicio)}`
                  : ""}
                . {sorteio.inscritos} pessoa(s) cadastrada(s).
              </p>

              {statusParticipante ? (
                <p
                  role="status"
                  className="mt-5 rounded-xl border border-steel-300 bg-steel-50 px-4 py-3 text-sm leading-relaxed text-deep"
                >
                  <strong>{statusParticipante.nome}</strong>:{" "}
                  {STATUS_PARTICIPANTE[statusParticipante.status] ??
                    "Cadastro registrado."}
                </p>
              ) : null}

              {avisoErro ? (
                <p
                  role="alert"
                  className="mt-5 rounded-xl border border-ember-400/40 bg-ember-50 px-4 py-3 text-sm leading-relaxed text-molten"
                >
                  {avisoErro}
                </p>
              ) : null}

              {sorteio.status === "realizado" ? (
                <div className="mt-6 rounded-xl border border-deep/10 bg-shell/50 p-4">
                  <p className="text-sm font-semibold text-deep">Resultado</p>
                  {sorteio.vencedores.length ? (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink">
                      {sorteio.vencedores.map((nome, indice) => (
                        <li key={`${nome}-${indice}`}>{nome}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-sm text-muted">
                      Nenhum vencedor registrado.
                    </p>
                  )}
                  {sorteio.semente ? (
                    <p className="mt-3 break-all text-xs text-muted">
                      Semente de auditoria: {sorteio.semente}
                    </p>
                  ) : null}
                </div>
              ) : sorteio.status === "aberto" ? (
                <form action={cadastrarParticipanteSorteio} className="mt-6 space-y-4">
                  <input type="hidden" name="sorteio_id" value={sorteio.sorteioId} />
                  <div>
                    <label htmlFor="nome" className={rotulo}>
                      Nome completo
                    </label>
                    <input
                      id="nome"
                      name="nome"
                      required
                      minLength={3}
                      maxLength={120}
                      className={campo}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className={rotulo}>
                      E-mail
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className={campo}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label htmlFor="email_responsavel" className={rotulo}>
                      E-mail do responsável (somente para menor de idade)
                    </label>
                    <input
                      id="email_responsavel"
                      name="email_responsavel"
                      type="email"
                      className={campo}
                    />
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">
                      Se preenchido, o responsável recebe um link de autorização
                      e o cadastro fica pendente até a resposta.
                    </p>
                  </div>
                  <label className="flex items-start gap-3 rounded-xl border border-deep/10 bg-shell/40 p-3 text-sm leading-relaxed text-ink">
                    <input
                      type="checkbox"
                      name="autoriza_comunicacoes"
                      value="true"
                      className="mt-0.5 h-4 w-4 accent-brick"
                    />
                    <span>
                      Quero receber comunicações sobre outros eventos e
                      novidades. Esta escolha é opcional e não impede a
                      participação no sorteio.
                    </span>
                  </label>
                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brick px-5 text-sm font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                  >
                    Quero participar
                  </button>
                </form>
              ) : (
                <p className="mt-5 text-sm text-muted">
                  Este sorteio está {sorteio.status}.
                </p>
              )}

              <p className="mt-6 text-xs leading-relaxed text-muted">
                Dados pessoais são tratados conforme a{" "}
                <Link
                  href="/privacidade"
                  className="font-semibold text-brick underline underline-offset-4 hover:text-molten"
                >
                  Política de Privacidade
                </Link>
                .
              </p>
            </>
          )}
        </section>
      </Container>
    </main>
  );
}
