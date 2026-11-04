import type { Metadata } from "next";
import Link from "next/link";
import { responderConsentimento } from "@/lib/consentimentos/acoes";
import { Container } from "@/components/ui/container";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Autorização do responsável",
  robots: { index: false, follow: false },
};

export const instant = false;

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Consentimento = {
  status?: string;
  expira_em?: string | null;
  expirado?: boolean;
  aceito_em?: string | null;
  nome_titular?: string | null;
  evento?: { titulo?: string } | null;
};

const ROTULOS: Record<string, string> = {
  aceito: "Autorização registrada",
  recusado: "Cadastro recusado",
  pendente: "Aguardando sua resposta",
  revogado: "Autorização revogada",
};

export default async function ConsentimentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ resposta?: string; decisao?: string }>;
}) {
  const { token } = await params;
  const { resposta, decisao } = await searchParams;
  const tokenValido = REGEX_UUID.test(token);

  let consentimento: Consentimento | null = null;

  if (tokenValido && isSupabaseConfigured) {
    try {
      const supabase = createSupabasePublicClient();
      const { data } = await supabase.rpc("consultar_consentimento_menor", {
        p_token: token,
      });
      consentimento = (data ?? null) as Consentimento | null;
    } catch {
      consentimento = null;
    }
  }

  const expirado =
    consentimento?.status === "pendente" && consentimento.expirado === true;

  const status = expirado ? "expirado" : consentimento?.status;
  const podeResponder = status === "pendente";

  const decisaoPrevia =
    decisao === "aceitar" || decisao === "recusar" ? decisao : null;
  const bloquearDecisao = (valor: string) =>
    decisaoPrevia !== null && decisaoPrevia !== valor;

  const aviso =
    resposta === "erro"
      ? "Não foi possível registrar sua resposta. Tente novamente."
      : resposta === "invalido"
        ? "Este link não está mais disponível."
        : null;

  return (
    <main className="flex-1 bg-canvas py-12 sm:py-16">
      <Container>
        <section className="mx-auto max-w-xl rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-8">
          <div className="h-1.5 w-14 rounded-full bg-brick" />
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep sm:text-3xl">
            Autorização do responsável
          </h1>

          {!tokenValido || !consentimento ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                Este link é inválido ou não existe mais. Se você recebeu um
                e-mail de autorização, use o link mais recente.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                Cadastro de{" "}
                <strong>{consentimento.nome_titular ?? "um participante"}</strong>
                {consentimento.evento?.titulo
                  ? ` para o evento ${consentimento.evento.titulo}`
                  : ""}
                .
              </p>

              <p className="mt-3 text-sm font-semibold text-deep">
                {ROTULOS[status ?? "pendente"] ?? "Aguardando sua resposta"}
              </p>

              {status === "expirado" ? (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  O prazo de 7 dias terminou. Peça um novo link à pessoa
                  responsável pelo cadastro.
                </p>
              ) : null}

              {aviso ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-ember-400/40 bg-ember-50 px-4 py-3 text-sm text-molten"
                >
                  {aviso}
                </p>
              ) : null}

              {podeResponder ? (
                <form action={responderConsentimento} className="mt-6 flex flex-wrap gap-3">
                  <input type="hidden" name="token" value={token} />
                  <button
                    type="submit"
                    name="decisao"
                    value="aceitar"
                    disabled={bloquearDecisao("aceitar")}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-brick px-5 text-sm font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Autorizar cadastro
                  </button>
                  <button
                    type="submit"
                    name="decisao"
                    value="recusar"
                    disabled={bloquearDecisao("recusar")}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-deep/20 bg-white px-5 text-sm font-semibold text-deep transition-colors hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Recusar
                  </button>
                </form>
              ) : null}

              <p className="mt-6 text-xs leading-relaxed text-muted">
                O aceite registra data, hora e origem da resposta. Dúvidas sobre
                dados pessoais estão na{" "}
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
