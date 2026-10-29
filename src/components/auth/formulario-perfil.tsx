"use client";

import { useActionState } from "react";
import { useState } from "react";
import { atualizarPerfil, type EstadoAuth } from "@/lib/auth/acoes";
import { CURSOS_DISPONIVEIS } from "@/lib/cursos";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10";

const rotulo = "block text-xs font-semibold uppercase tracking-[0.14em] text-deep";
const seriesDisponiveis = ["9º", "1º", "2º", "3º"] as const;
const instituicaoEtec = "ETEC Darcy Pereira de Moraes";

function valorCursoSelecionado(curso: string | null) {
  if (!curso) return "";

  const normalizar = (valor: string) =>
    valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  const cursoNormalizado = normalizar(curso);

  if (cursoNormalizado === "INFORMATICA") {
    return "INFORMÁTICA PARA INTERNET";
  }

  return (
    CURSOS_DISPONIVEIS.find(
      (opcao) => normalizar(opcao.valor) === cursoNormalizado,
    )?.valor ?? curso
  );
}

function valorSerieSelecionada(serie: string | null) {
  if (!serie) return "";

  const valor = serie.trim().replace(/\s*ano$/i, "").trim();
  const porNumero: Record<string, (typeof seriesDisponiveis)[number]> = {
    "9": "9º",
    "9º": "9º",
    "1": "1º",
    "1º": "1º",
    "2": "2º",
    "2º": "2º",
    "3": "3º",
    "3º": "3º",
  };

  return porNumero[valor] ?? serie;
}

export type DadosPerfil = {
  nome_completo: string;
  curso: string | null;
  ano_serie: string | null;
  instituicao: string | null;
  linkedin_url: string | null;
};

export function FormularioPerfil({ perfil }: { perfil: DadosPerfil }) {
  const [estado, formAction, pendente] = useActionState<EstadoAuth, FormData>(
    atualizarPerfil,
    null,
  );
  const cursoAtual = valorCursoSelecionado(perfil.curso);
  const serieAtual = valorSerieSelecionada(perfil.ano_serie);
  const instituicaoExistente = perfil.instituicao?.trim() ?? "";
  const [tipoInstituicao, setTipoInstituicao] = useState(
    instituicaoExistente.toLocaleLowerCase("pt-BR") ===
      instituicaoEtec.toLocaleLowerCase("pt-BR")
      ? "etec"
      : instituicaoExistente
        ? "outro"
        : "",
  );
  const [outraInstituicao, setOutraInstituicao] = useState(
    tipoInstituicao === "outro" ? instituicaoExistente : "",
  );

  return (
    <form action={formAction} className="mt-6 space-y-5">
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

      <div>
        <label htmlFor="nome_completo" className={rotulo}>
          Nome completo
        </label>
        <input
          id="nome_completo"
          name="nome_completo"
          type="text"
          required
          minLength={3}
          maxLength={120}
          autoComplete="name"
          defaultValue={perfil.nome_completo}
          className={campo}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="curso" className={rotulo}>
            Curso
          </label>
          <select
            id="curso"
            name="curso"
            className={campo}
            defaultValue={cursoAtual}
          >
            <option value="">Selecione seu curso</option>
            {cursoAtual &&
            !CURSOS_DISPONIVEIS.some((opcao) => opcao.valor === cursoAtual) ? (
              <option value={cursoAtual}>Atual: {perfil.curso}</option>
            ) : null}
            {CURSOS_DISPONIVEIS.map((curso) => (
              <option key={curso.valor} value={curso.valor}>
                {curso.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ano_serie" className={rotulo}>
            Série / ano
          </label>
          <select
            id="ano_serie"
            name="ano_serie"
            className={campo}
            defaultValue={serieAtual}
          >
            <option value="">Selecione sua série</option>
            {!seriesDisponiveis.includes(
              serieAtual as (typeof seriesDisponiveis)[number],
            ) && serieAtual ? (
              <option value={serieAtual}>Atual: {perfil.ano_serie}</option>
            ) : null}
            {seriesDisponiveis.map((serie) => (
              <option key={serie} value={serie}>
                {serie} ano
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="instituicao_tipo" className={rotulo}>
          Instituição
        </label>
        <select
          id="instituicao_tipo"
          value={tipoInstituicao}
          onChange={(event) => setTipoInstituicao(event.target.value)}
          className={campo}
        >
          <option value="">Selecione sua instituição</option>
          <option value="etec">ETEC Darcy Pereira de Moraes</option>
          <option value="outro">Outro</option>
        </select>
        {tipoInstituicao === "etec" ? (
          <input type="hidden" name="instituicao" value={instituicaoEtec} />
        ) : tipoInstituicao === "outro" ? (
          <input
            id="instituicao"
            name="instituicao"
            type="text"
            required
            maxLength={160}
            autoComplete="organization"
            value={outraInstituicao}
            onChange={(event) => setOutraInstituicao(event.target.value)}
            className={campo}
            placeholder="Digite o nome da sua instituição"
          />
        ) : (
          <input type="hidden" name="instituicao" value="" />
        )}
      </div>

      <div>
        <label htmlFor="linkedin_url" className={rotulo}>
          LinkedIn <span className="font-normal normal-case tracking-normal text-muted">(opcional)</span>
        </label>
        <input
          id="linkedin_url"
          name="linkedin_url"
          type="url"
          autoComplete="url"
          defaultValue={perfil.linkedin_url ?? ""}
          className={campo}
          placeholder="https://www.linkedin.com/in/..."
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex h-11 items-center justify-center rounded-full bg-brick px-6 text-sm font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendente ? "Salvando..." : "Salvar alterações"}
        </button>
        <p className="text-xs leading-relaxed text-muted">
          Usamos esses dados para emitir certificados e organizar as listas de
          presença.
        </p>
      </div>
    </form>
  );
}
