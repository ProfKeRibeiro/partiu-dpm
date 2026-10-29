"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { criarConta, entrar, type EstadoAuth } from "@/lib/auth/acoes";
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

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />

      {estado?.erro ? (
        <p
          role="alert"
          className="rounded-xl border border-ember-400/40 bg-ember-50 px-4 py-3 text-sm text-molten"
        >
          {estado.erro}
        </p>
      ) : null}

      {estado?.mensagem ? (
        <p
          role="status"
          className="rounded-xl border border-steel-300 bg-steel-50 px-4 py-3 text-sm text-deep"
        >
          {estado.mensagem}
        </p>
      ) : null}

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
              <select id="curso" name="curso" required className={campo}>
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
          className={campo}
          placeholder="voce@exemplo.com"
        />
            {modo === "criar" && categoria === "aluno" ? (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                <strong className="font-semibold text-deep">
                  Recomendamos fortemente
                </strong>{" "}
                que alunos usem o e-mail institucional
                <span className="font-semibold text-deep">
                  {" "}@aluno.cps.sp.gov.br
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
          className={campo}
          placeholder={modo === "criar" ? "Mínimo de 8 caracteres" : "Sua senha"}
        />
        {modo === "criar" ? (
          <p className="mt-1.5 text-xs text-muted">
            Use uma senha longa e única. Ela nunca é exibida para a organização.
          </p>
        ) : null}
      </div>

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
    </form>
  );
}
