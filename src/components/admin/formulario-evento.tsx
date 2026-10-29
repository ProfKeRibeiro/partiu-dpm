"use client";

import { useActionState } from "react";
import { IconeCalendario, IconeCheck, IconeSetaDireita } from "@/components/ui/icons";
import type { PublicoAlvo } from "@/types/evento";
import {
  salvarEvento,
  type EstadoEvento,
} from "@/lib/admin/eventos-acoes";
import {
  TEMA_EVENTO_PADRAO,
  temasEvento,
} from "@/lib/tema-evento";
import { isoParaDataLocal } from "@/lib/data-local";
import { CURSOS_DISPONIVEIS } from "@/lib/cursos";

type ValoresIniciais = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  modalidade: "presencial" | "online" | "hibrido";
  local: string | null;
  link: string | null;
  inicio: string;
  fim: string;
  inscricoesInicio: string | null;
  inscricoesFim: string | null;
  limiteVagas: number | null;
  publicoAlvo: PublicoAlvo;
  cursosPermitidos: string[];
  seriesPermitidas: string[];
  status: string;
  imagemUrl: string | null;
  corTema: string;
};

const input =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-sm text-deep outline-none transition focus:border-brick focus:ring-4 focus:ring-brick/10";
const label = "block text-sm font-semibold text-deep";
const seriesDisponiveis = ["9º", "1º", "2º", "3º"];

const publicosDisponiveis = [
  { valor: "alunos_escola", rotulo: "Alunos da escola" },
  {
    valor: "professores_funcionarios",
    rotulo: "Professores e funcionários",
  },
  { valor: "comunidade_escolar", rotulo: "Comunidade escolar" },
  { valor: "externo", rotulo: "Público externo" },
  { valor: "todos", rotulo: "Todos" },
] as const;

function manterOpcoesSalvas<T extends string>(
  opcoes: T[],
  selecionadas: string[],
) {
  return Array.from(new Set([...opcoes, ...selecionadas]));
}

export function FormularioEvento({
  valoresIniciais,
}: {
  valoresIniciais?: ValoresIniciais;
}) {
  const [estado, acao, pendente] = useActionState<EstadoEvento, FormData>(
    salvarEvento,
    null,
  );
  const cursos = manterOpcoesSalvas(
    CURSOS_DISPONIVEIS.map((curso) => curso.valor),
    (valoresIniciais?.cursosPermitidos ?? []).map((curso) => {
      const cursoNormalizado = curso
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

      return cursoNormalizado === "informatica" ||
        cursoNormalizado === "informatica para internet"
        ? "INFORMÁTICA PARA INTERNET"
        : curso;
    }),
  );
  const series = seriesDisponiveis;

  return (
    <form action={acao} className="space-y-7">
      {valoresIniciais ? (
        <input type="hidden" name="evento_id" value={valoresIniciais.id} />
      ) : null}
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
          className="rounded-xl border border-steel-300 bg-steel-50 px-4 py-3 text-sm font-medium text-deep"
        >
          {estado.mensagem}
        </p>
      ) : null}

      <section className="rounded-2xl border border-deep/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-papaya text-steel-700 ring-1 ring-deep/10">
            <IconeCalendario className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-deep">
              Informações do evento
            </h2>
            <p className="text-xs text-muted">Os campos marcados com * são obrigatórios.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={label}>Título *</span>
            <input name="titulo" required minLength={3} maxLength={160} defaultValue={valoresIniciais?.titulo} className={input} placeholder="Ex.: Oficina de currículo e LinkedIn" />
          </label>
          <label>
            <span className={label}>Tipo *</span>
            <select name="tipo" defaultValue={valoresIniciais?.tipo ?? "palestra"} className={input}>
              <option value="palestra">Palestra</option><option value="oficina">Oficina</option><option value="curso">Curso</option><option value="feira">Feira</option><option value="treinamento">Treinamento</option><option value="outro">Outro</option>
            </select>
          </label>
          <label>
            <span className={label}>Modalidade *</span>
            <select name="modalidade" defaultValue={valoresIniciais?.modalidade ?? "presencial"} className={input}>
              <option value="presencial">Presencial</option><option value="online">Online</option><option value="hibrido">Híbrido</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className={label}>Descrição</span>
            <textarea name="descricao" rows={5} maxLength={4000} defaultValue={valoresIniciais?.descricao} className={input} placeholder="Apresente o objetivo, o conteúdo e para quem o encontro é indicado." />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-deep/10 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-lg font-semibold text-deep">Data, acesso e vagas</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label><span className={label}>Início *</span><input type="datetime-local" name="data_inicio" required defaultValue={isoParaDataLocal(valoresIniciais?.inicio)} className={input} /></label>
          <label><span className={label}>Término *</span><input type="datetime-local" name="data_fim" required defaultValue={isoParaDataLocal(valoresIniciais?.fim)} className={input} /></label>
          <label><span className={label}>Abertura das inscrições</span><input type="datetime-local" name="inicio_inscricoes" defaultValue={isoParaDataLocal(valoresIniciais?.inscricoesInicio)} className={input} /></label>
          <label><span className={label}>Encerramento das inscrições</span><input type="datetime-local" name="fim_inscricoes" defaultValue={isoParaDataLocal(valoresIniciais?.inscricoesFim)} className={input} /></label>
          <label><span className={label}>Local</span><input name="local_evento" maxLength={200} defaultValue={valoresIniciais?.local ?? ""} className={input} placeholder="Ex.: Auditório da ETEC" /></label>
          <label><span className={label}>Link de acesso</span><input type="url" name="link_evento" maxLength={500} defaultValue={valoresIniciais?.link ?? ""} className={input} placeholder="https://..." /></label>
          <label><span className={label}>Limite de vagas</span><input type="number" name="limite_vagas" min="1" step="1" defaultValue={valoresIniciais?.limiteVagas ?? ""} className={input} placeholder="Deixe em branco para ilimitado" /></label>
          <label><span className={label}>Status *</span><select name="status" defaultValue={valoresIniciais?.status ?? "rascunho"} className={input}><option value="rascunho">Rascunho</option><option value="publicado">Publicado</option><option value="cancelado">Cancelado</option><option value="encerrado">Encerrado</option></select></label>
        </div>
      </section>

      <section className="rounded-2xl border border-deep/10 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-lg font-semibold text-deep">Público e imagem</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>Público-alvo *</span>
            <select
              name="publico_alvo"
              defaultValue={valoresIniciais?.publicoAlvo ?? "todos"}
              className={input}
            >
              {publicosDisponiveis.map((publico) => (
                <option key={publico.valor} value={publico.valor}>
                  {publico.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label><span className={label}>Imagem de capa (URL)</span><input type="url" name="imagem_url" maxLength={500} defaultValue={valoresIniciais?.imagemUrl ?? ""} className={input} placeholder="https://..." /></label>
          <fieldset>
            <legend className={label}>Cursos permitidos</legend>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Sem seleção, todos os cursos poderão participar.
            </p>
            <details className="group mt-2 rounded-xl border border-deep/15 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick">
                Selecionar cursos
                <IconeSetaDireita className="h-4 w-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="grid gap-2 border-t border-deep/10 p-3">
                {cursos.map((curso) => (
                  <label
                    key={curso}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-deep hover:bg-canvas"
                  >
                    <input
                      type="checkbox"
                      name="cursos_permitidos"
                      value={curso}
                      defaultChecked={valoresIniciais?.cursosPermitidos.includes(curso)}
                      className="h-4 w-4 rounded border-deep/30 accent-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    />
                    {CURSOS_DISPONIVEIS.find((opcao) => opcao.valor === curso)?.rotulo ?? curso}
                  </label>
                ))}
              </div>
            </details>
          </fieldset>
          <fieldset>
            <legend className={label}>Séries permitidas</legend>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Sem seleção, todas as séries poderão participar.
            </p>
            <details className="group mt-2 rounded-xl border border-deep/15 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick">
                Selecionar séries
                <IconeSetaDireita className="h-4 w-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="grid grid-cols-2 gap-2 border-t border-deep/10 p-3">
                {series.map((serie) => (
                  <label
                    key={serie}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-deep hover:bg-canvas"
                  >
                    <input
                      type="checkbox"
                      name="series_permitidas"
                      value={serie}
                      defaultChecked={valoresIniciais?.seriesPermitidas.includes(serie)}
                      className="h-4 w-4 rounded border-deep/30 accent-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                    />
                    {serie} ano
                  </label>
                ))}
              </div>
            </details>
          </fieldset>
        </div>
      </section>

      <section className="rounded-2xl border border-deep/10 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-deep">
            Cor da página do evento
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Escolha uma das 32 paletas. A página pública usará esta cor nos
            destaques, botões e fundos suaves, com contraste preservado.
          </p>
        </div>

        <fieldset className="mt-5">
          <legend className="sr-only">Paleta de cores do evento</legend>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {temasEvento.map((tema) => (
              <label key={tema.id} className="group relative cursor-pointer">
                <input
                  type="radio"
                  name="cor_tema"
                  value={tema.id}
                  defaultChecked={tema.id === (valoresIniciais?.corTema ?? TEMA_EVENTO_PADRAO)}
                  className="peer sr-only"
                />
                <span
                  className="flex aspect-square items-center justify-center rounded-xl border-2 border-transparent shadow-sm transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-deep peer-checked:border-deep peer-checked:ring-4 peer-checked:ring-deep/35 peer-checked:ring-offset-2 group-hover:scale-105"
                  style={{ backgroundColor: tema.primaria }}
                  aria-hidden="true"
                />
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition peer-checked:opacity-100"
                  aria-hidden="true"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-deep text-white shadow-md">
                    <IconeCheck className="h-4 w-4" />
                  </span>
                </span>
                <span className="sr-only">{tema.nome}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            A cor marcada será a predominante. Ex.: use Esmeralda para um
            evento como MongoDB Day.
          </p>
        </fieldset>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={pendente} className="inline-flex h-11 items-center justify-center rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep">
          {pendente
            ? "Salvando…"
            : valoresIniciais
              ? "Salvar alterações"
              : "Cadastrar evento"}
        </button>
      </div>
    </form>
  );
}
