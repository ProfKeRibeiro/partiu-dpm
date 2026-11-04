import type { Metadata } from "next";
import Link from "next/link";
import { inscreverAlunoEscola } from "@/lib/escolas/acoes";
import { consultarEscolaPorCodigo } from "@/lib/escolas/consultas";
import { Container } from "@/components/ui/container";
import { formatarDataHora } from "@/lib/format";

export const metadata: Metadata = {
  title: "Subinscrição da escola",
  robots: { index: false, follow: false },
};

export const instant = false;

const ERROS: Record<string, string> = {
  aluno_duplicado: "Este aluno já está inscrito neste evento.",
  codigo_invalido: "Código de subinscrição inválido.",
  nome_invalido: "Informe o nome do aluno (3 a 120 caracteres).",
  email_invalido: "Informe um e-mail válido para o aluno.",
  email_responsavel_invalido: "Informe um e-mail válido para o responsável.",
  inscricoes_encerradas: "As inscrições deste evento estão encerradas.",
  erro: "Não foi possível concluir a subinscrição. Tente novamente.",
};

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-sm text-deep outline-none transition focus:border-brick focus:ring-4 focus:ring-brick/10";
const rotulo = "block text-sm font-semibold text-deep";

export default async function EscolaPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ aluno?: string; erro?: string }>;
}) {
  const { codigo } = await params;
  const { aluno, erro } = await searchParams;
  const escola = await consultarEscolaPorCodigo(codigo).catch(() => null);
  const avisoErro = erro ? (ERROS[erro] ?? ERROS.erro) : null;

  return (
    <main className="flex-1 bg-canvas py-12 sm:py-16">
      <Container>
        <section className="mx-auto max-w-2xl rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-8">
          <div className="h-1.5 w-14 rounded-full bg-brick" />
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep sm:text-3xl">
            Subinscrição da escola
          </h1>

          {!escola ? (
            <p className="mt-3 text-sm leading-relaxed text-ink">
              Código inválido ou escola não encontrada. Confira o link recebido
              do professor responsável.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                <strong>{escola.escolaNome}</strong> — {escola.evento.titulo}
                {escola.evento.dataInicio
                  ? `, ${formatarDataHora(escola.evento.dataInicio)}`
                  : ""}
                {escola.evento.local ? `, ${escola.evento.local}` : ""}.
              </p>
              <p className="mt-2 text-xs text-muted">
                {escola.autorizados} aluno(s) autorizado(s) ·{" "}
                {escola.pendentes} aguardando responsável.
              </p>

              {aluno === "pendente" ? (
                <p
                  role="status"
                  className="mt-5 rounded-xl border border-steel-300 bg-steel-50 px-4 py-3 text-sm leading-relaxed text-deep"
                >
                  Subinscrição registrada. Enviamos um link ao e-mail do
                  responsável; a inscrição será confirmada quando ele autorizar.
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

              <form action={inscreverAlunoEscola} className="mt-6 space-y-4">
                <input type="hidden" name="codigo" value={escola.codigo} />
                <div>
                  <label htmlFor="nome" className={rotulo}>
                    Nome completo do aluno
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
                    E-mail do aluno
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
                    E-mail do responsável
                  </label>
                  <input
                    id="email_responsavel"
                    name="email_responsavel"
                    type="email"
                    required
                    className={campo}
                  />
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    O responsável recebe um link para autorizar a participação.
                    A inscrição fica pendente até a resposta.
                  </p>
                </div>
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brick px-5 text-sm font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                >
                  Enviar subinscrição
                </button>
              </form>

              <p className="mt-6 text-xs leading-relaxed text-muted">
                Dúvidas sobre dados pessoais estão na{" "}
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
