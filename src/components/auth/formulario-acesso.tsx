"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useActionState } from "react";
import { criarConta, entrar, type EstadoAuth } from "@/lib/auth/acoes";
import { AvisoFormulario } from "@/components/ui/aviso-formulario";
import { atributosDeErro, camposDoErro } from "@/components/auth/campos-com-erro";
import { CURSOS_DISPONIVEIS } from "@/lib/cursos";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10";

const rotulo =
  "block text-xs font-semibold uppercase tracking-[0.14em] text-deep";

const link =
  "font-semibold text-brick underline underline-offset-4 transition-colors hover:text-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick";

export function FormularioAcesso({
  modo,
  next,
}: {
  modo: "entrar" | "criar";
  next: string;
}) {
  const acao = modo === "criar" ? criarConta : entrar;
  const [estado, formAction, pendente] = useActionState<EstadoAuth, FormData>(
    acao,
    null,
  );
  const [categoria, setCategoria] = useState<"aluno" | "servidor" | "externo">(
    "aluno",
  );
  const [aceite, setAceite] = useState(false);
  const [menorIdade, setMenorIdade] = useState(false);
  const [emailResponsavel, setEmailResponsavel] = useState("");
  const [erroLocal, setErroLocal] = useState("");
  const alertaRef = useRef<HTMLParagraphElement>(null);
  const erros = camposDoErro(estado?.erro);
  const ID_ERRO = "erro-acesso";

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4"
      onSubmit={(evento) => {
        if (modo !== "criar") return;

        if (!aceite) {
          evento.preventDefault();
          setErroLocal(
            "Para criar a conta, marque que leu e aceita os Termos de Uso e a Política de Privacidade.",
          );
          window.requestAnimationFrame(() => alertaRef.current?.focus());
          return;
        }

        if (
          menorIdade &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailResponsavel.trim())
        ) {
          evento.preventDefault();
          setErroLocal(
            "Informe um e-mail válido do responsável para continuar.",
          );
          window.requestAnimationFrame(() => alertaRef.current?.focus());
          return;
        }

        setErroLocal("");
      }}
    >
      <input type="hidden" name="next" value={next} />

      <AvisoFormulario tipo="erro" mensagem={estado?.erro} id={ID_ERRO} />
      <AvisoFormulario
        tipo="sucesso"
        mensagem={estado?.mensagem}
        id="aviso-acesso"
      />

      {modo === "criar" ? (
        <>
          <div>
            <label htmlFor="nome" className={rotulo}>
              Nome completo
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              autoComplete="name"
              required
              minLength={3}
              maxLength={120}
              {...atributosDeErro(erros, "nome", ID_ERRO)}
              className={campo}
              placeholder="Como você quer aparecer no certificado"
            />
          </div>

          <div>
            <label htmlFor="categoria" className={rotulo}>
              Você é
            </label>
            <select
              id="categoria"
              name="categoria"
              required
              value={categoria}
              onChange={(event) =>
                setCategoria(event.target.value as typeof categoria)
              }
              {...atributosDeErro(erros, "categoria", ID_ERRO)}
              className={campo}
            >
              <option value="aluno">Aluno</option>
              <option value="servidor">Professor / funcionário</option>
              <option value="externo">Público externo</option>
            </select>
          </div>

          {categoria === "aluno" ? (
            <div>
              <label htmlFor="curso" className={rotulo}>
                Curso
              </label>
              <select
                id="curso"
                name="curso"
                required
                {...atributosDeErro(erros, "curso", ID_ERRO)}
                className={campo}
              >
                <option value="">Selecione seu curso</option>
                {CURSOS_DISPONIVEIS.map((curso) => (
                  <option key={curso.valor} value={curso.valor}>
                    {curso.rotulo}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </>
      ) : null}

      <div>
        <label htmlFor="email" className={rotulo}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          {...atributosDeErro(
            erros,
            "email",
            ID_ERRO,
            modo === "criar" && categoria === "aluno" ? "ajuda-email" : null,
          )}
          className={campo}
          placeholder="voce@exemplo.com"
        />
        {modo === "criar" && categoria === "aluno" ? (
          <p id="ajuda-email" className="mt-2 text-xs leading-relaxed text-muted">
            <strong className="font-semibold text-deep">
              Recomendamos fortemente
            </strong>{" "}
            que alunos usem o e-mail institucional
            <span className="font-semibold text-deep">
              {" "}
              @aluno.cps.sp.gov.br
            </span>
            .
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="senha" className={rotulo}>
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete={modo === "criar" ? "new-password" : "current-password"}
          required
          minLength={modo === "criar" ? 8 : undefined}
          {...atributosDeErro(
            erros,
            "senha",
            ID_ERRO,
            modo === "criar" ? "ajuda-senha" : null,
          )}
          className={campo}
          placeholder={modo === "criar" ? "Mínimo de 8 caracteres" : "Sua senha"}
        />
        {modo === "criar" ? (
          <p id="ajuda-senha" className="mt-1.5 text-xs text-muted">
            Use uma senha longa e única. Ela nunca é exibida para a organização.
          </p>
        ) : (
          <p className="mt-2 text-right text-xs">
            <Link href="/recuperar-senha" className={link}>
              Esqueci minha senha
            </Link>
          </p>
        )}
      </div>

      {modo === "criar" ? (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-deep/10 bg-canvas/60 p-3">
            <input
              type="checkbox"
              name="aceite_termos"
              value="true"
              checked={aceite}
              onChange={(evento) => {
                setAceite(evento.target.checked);
                setErroLocal("");
              }}
              aria-invalid={erroLocal && !aceite ? true : undefined}
              aria-describedby="ajuda-termos"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-deep/30 accent-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            />
            <span
              id="ajuda-termos"
              className="text-xs leading-relaxed text-ink"
            >
              Li e aceito os{" "}
              <Link
                href="/termos"
                className="font-semibold text-brick underline underline-offset-4 hover:text-molten"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacidade"
                className="font-semibold text-brick underline underline-offset-4 hover:text-molten"
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-deep/10 bg-canvas/60 p-3">
            <input
              type="checkbox"
              name="menor_idade"
              value="true"
              checked={menorIdade}
              onChange={(evento) => {
                setMenorIdade(evento.target.checked);
                setErroLocal("");
              }}
              aria-describedby="ajuda-menor"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-deep/30 accent-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            />
            <span id="ajuda-menor" className="text-xs leading-relaxed text-ink">
              <span className="block font-semibold text-deep">
                Tenho menos de 18 anos
              </span>
              A conta só será validada depois que o responsável autorizar pelo
              link enviado a ele.
            </span>
          </label>

          {menorIdade ? (
            <div>
              <label htmlFor="email_responsavel" className={rotulo}>
                E-mail do responsável
              </label>
              <input
                id="email_responsavel"
                name="email_responsavel"
                type="email"
                required
                value={emailResponsavel}
                onChange={(evento) => {
                  setEmailResponsavel(evento.target.value);
                  setErroLocal("");
                }}
                autoComplete="off"
                aria-describedby="ajuda-responsavel"
                className={campo}
                placeholder="responsavel@exemplo.com"
              />
              <p
                id="ajuda-responsavel"
                className="mt-1.5 text-xs leading-relaxed text-muted"
              >
                Enviaremos um pedido de autorização para este e-mail. Ele não
                aparece publicamente.
              </p>
            </div>
          ) : null}

          {erroLocal ? (
            <p
              ref={alertaRef}
              tabIndex={-1}
              role="alert"
              className="rounded-xl border border-ember-400/40 bg-ember-50 px-4 py-3 text-sm text-molten outline-none focus-visible:ring-4 focus-visible:ring-brick/20"
            >
              {erroLocal}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendente
          ? "Enviando..."
          : modo === "criar"
            ? "Criar minha conta"
            : "Entrar"}
      </button>

      <p className="text-center text-sm text-muted">
        {modo === "criar" ? (
          <>
            Já tem conta?{" "}
            <Link
              href={`/entrar?modo=entrar&next=${encodeURIComponent(next)}`}
              className={link}
            >
              Entrar
            </Link>{" "}
            ·{" "}
            <Link href="/recuperar-senha" className={link}>
              Esqueci minha senha
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <Link
              href={`/entrar?modo=criar&next=${encodeURIComponent(next)}`}
              className={link}
            >
              Criar conta
            </Link>
          </>
        )}
      </p>

      <p className="text-center text-xs leading-relaxed text-muted">
        Não recebeu o e-mail de confirmação?{" "}
        <Link href="/reconfirmar-email" className={link}>
          Reenviar
        </Link>
      </p>
    </form>
  );
}
