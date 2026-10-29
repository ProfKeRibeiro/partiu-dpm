import Link from "next/link";
import { sair } from "@/lib/auth/acoes";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/ui/container";
import { IconeCheck, IconeEscudo, IconeUsuarios } from "@/components/ui/icons";

/**
 * Tela de bloqueio usada quando a página depende de sessão/administração.
 *
 * Optamos por renderizar um estado claro em vez de chamar `redirect()` dentro
 * do render: com Cache Components o redirecionamento no meio do streaming
 * substitui a resposta por um shell de erro. A navegação de entrada continua
 * sendo feita pelo proxy (`/conta` e `/admin` sem sessão) e pelos Server
 * Actions, que podem redirecionar com segurança.
 */
export function AcessoRestrito({
  variante,
  destinoLogin,
}: {
  variante: "sessao" | "admin";
  destinoLogin: string;
}) {
  const ehAdmin = variante === "admin";

  return (
    <main className="flex-1 bg-canvas py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-xl rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-8">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${
              ehAdmin
                ? "bg-deep text-papaya ring-deep/20"
                : "bg-papaya text-steel-700 ring-deep/10"
            }`}
          >
            {ehAdmin ? (
              <IconeEscudo className="h-5 w-5" />
            ) : (
              <IconeUsuarios className="h-5 w-5" />
            )}
          </span>

          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep">
            {ehAdmin ? "Área restrita à organização" : "Entre para ver sua área"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {ehAdmin
              ? "Seu usuário não tem permissão de administrador. Se você faz parte da organização, peça para incluírem seu e-mail na lista de administradores."
              : "Sua sessão não foi encontrada ou expirou. Entre com sua conta para acompanhar inscrições, presenças e certificados."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {ehAdmin ? (
              <>
                <ButtonLink href="/conta" tamanho="md">
                  Ir para minha área
                </ButtonLink>
                <ButtonLink
                  href={`/entrar?next=${encodeURIComponent(destinoLogin)}`}
                  variante="contorno"
                  tamanho="md"
                >
                  Entrar com outra conta
                </ButtonLink>
              </>
            ) : (
              <ButtonLink
                href={`/entrar?next=${encodeURIComponent(destinoLogin)}`}
                tamanho="md"
              >
                Entrar
              </ButtonLink>
            )}

            <Link
              href="/eventos"
              className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Ver eventos
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}

/**
 * Mostrada em `/entrar` quando a sessão já está ativa. Substitui o
 * `redirect("/conta")`, que gerava um shell de erro no streaming.
 */
export function SessaoAtiva({ email }: { email: string | null }) {
  return (
    <main className="flex-1 bg-canvas py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-xl rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-papaya text-steel-700 ring-1 ring-deep/10">
            <IconeCheck className="h-5 w-5" />
          </span>

          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep">
            Você já está conectado
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {email
              ? `Sessão ativa como ${email}.`
              : "Sua sessão já está ativa neste navegador."}{" "}
            Continue para a sua área ou saia para entrar com outra conta.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <ButtonLink href="/conta" tamanho="md">
              Ir para minha área
            </ButtonLink>
            <form action={sair}>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full border border-deep/20 bg-white px-5 text-sm font-semibold text-deep transition-colors hover:border-deep/35 hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </Container>
    </main>
  );
}
