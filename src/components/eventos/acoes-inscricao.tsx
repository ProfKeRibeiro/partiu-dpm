"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useActionState } from "react";
import { IconeAlerta, IconeCheck, IconeInstagram, IconeSetaDiagonal } from "@/components/ui/icons";
import { useDialogoAcessivel } from "@/components/ui/use-dialogo";
import { CardParticipacao } from "@/components/inscricoes/card-participacao";
import { formatarDataHora } from "@/lib/format";
import {
  cancelarInscricao,
  inscreverEmEvento,
  responderConvite,
  type EstadoInscricao,
} from "@/lib/inscricoes/acoes";

type StatusInscricao =
  | "confirmada"
  | "cancelada"
  | "lista_espera"
  | "aguardando_confirmacao";

export function AcoesInscricao({
  eventoId,
  situacao,
  autenticado,
  inscricao,
  linkAcesso,
  eventoIniciado,
  destinoLogin,
  filaEspera = 0,
  posicaoFila = null,
  conviteExpiraEm = null,
}: {
  eventoId: string;
  situacao: "aberta" | "em-breve" | "encerrada" | "lotado";
  autenticado: boolean;
  inscricao: { id: string; status: StatusInscricao } | null;
  linkAcesso: string | null;
  eventoIniciado: boolean;
  destinoLogin: string;
  filaEspera?: number;
  posicaoFila?: number | null;
  conviteExpiraEm?: string | null;
}) {
  const [estadoInscricao, acaoInscrever, inscrevendo] = useActionState<
    EstadoInscricao,
    FormData
  >(inscreverEmEvento, null);
  const [estadoCancelamento, acaoCancelar, cancelando] = useActionState<
    EstadoInscricao,
    FormData
  >(cancelarInscricao, null);
  const [estadoConvite, acaoResponderConvite, respondendoConvite] =
    useActionState<EstadoInscricao, FormData>(responderConvite, null);
  const [modalCancelamento, setModalCancelamento] = useState(false);
  const [cardAberto, setCardAberto] = useState(false);
  const [cardDispensado, setCardDispensado] = useState(false);
  const formCancelar = useRef<HTMLFormElement>(null);
  const painelModal = useRef<HTMLDivElement>(null);

  useDialogoAcessivel({
    aberto: modalCancelamento,
    onFechar: () => setModalCancelamento(false),
    painelRef: painelModal,
  });

  /* Abre o card automaticamente assim que a inscriÃ§Ã£o Ã© confirmada, para a
   * pessoa poder compartilhar no story do Instagram sem procurar o botÃ£o. */
  const inscricaoRecemConfirmada =
    estadoInscricao?.ok === true &&
    estadoInscricao.codigo === "inscrito" &&
    Boolean(estadoInscricao.inscricaoId);
  const cardVisivel =
    cardAberto || (inscricaoRecemConfirmada && !cardDispensado);

  function fecharCard() {
    setCardAberto(false);
    setCardDispensado(true);
  }

  const confirmada = inscricao?.status === "confirmada";
  const mensagem = estadoInscricao ?? estadoCancelamento;
  const podeListaEspera = situacao === "lotado";

  if (!autenticado) {
    if (situacao !== "aberta" && !podeListaEspera) return null;

    return (
      <div>
        <Link
          href={`/entrar?next=${encodeURIComponent(destinoLogin)}`}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {podeListaEspera ? "Entrar para a lista de espera" : "Entrar para se inscrever"}
          <IconeSetaDiagonal className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-center text-xs leading-relaxed text-muted">
          {podeListaEspera
            ? "As vagas estÃ£o preenchidas. Entre para entrar na lista de espera e ser avisado se uma vaga abrir."
            : "A inscriÃ§Ã£o exige uma conta no Partiu DPM."}
        </p>
      </div>
    );
  }

  if (confirmada && inscricao) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-deep/15 bg-papaya px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-deep">
            <IconeCheck className="h-4 w-4 text-brick" />
            InscriÃ§Ã£o confirmada
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink">
            {eventoIniciado
              ? "Este evento jÃ¡ comeÃ§ou. Bom proveito!"
              : "Guarde este comprovante. VocÃª pode cancelar atÃ© o inÃ­cio do evento."}
          </p>
        </div>

        {linkAcesso ? (
          <a
            href={linkAcesso}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep transition-colors hover:border-deep/35 hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Acessar link do evento
            <IconeSetaDiagonal className="h-4 w-4" />
          </a>
        ) : null}

        <button
          type="button"
          onClick={() => setCardAberto(true)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep transition-colors hover:border-deep/35 hover:bg-papaya focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <IconeInstagram className="h-4 w-4" aria-hidden="true" />
          Compartilhar no Instagram
        </button>

        {!eventoIniciado ? (
          <>
            <form ref={formCancelar} action={acaoCancelar}>
              <input type="hidden" name="inscricao_id" value={inscricao.id} />
              <input type="hidden" name="evento_id" value={eventoId} />
              <button
                type="button"
                disabled={cancelando}
                onClick={() =>
                  filaEspera > 0
                    ? setModalCancelamento(true)
                    : formCancelar.current?.requestSubmit()
                }
                className="inline-flex h-10 w-full items-center justify-center rounded-full border border-brick/40 px-4 text-xs font-semibold text-brick transition-colors hover:bg-ember-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelando ? "Cancelando..." : "Cancelar inscriÃ§Ã£o"}
              </button>
            </form>

            {modalCancelamento ? (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center bg-deep/50 p-4 sm:items-center"
                role="presentation"
                onClick={() => setModalCancelamento(false)}
              >
                <div
                  ref={painelModal}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="titulo-cancelar-inscricao"
                  aria-describedby="texto-cancelar-inscricao"
                  tabIndex={-1}
                  className="w-full max-w-sm rounded-2xl border border-deep/10 bg-white p-5 text-left shadow-xl outline-none"
                  onClick={(evento) => evento.stopPropagation()}
                >
                  <h2
                    id="titulo-cancelar-inscricao"
                    className="font-display text-lg font-semibold tracking-tight text-deep"
                  >
                    Cancelar sua inscriÃ§Ã£o?
                  </h2>
                  <p
                    id="texto-cancelar-inscricao"
                    className="mt-2 text-sm leading-relaxed text-muted"
                  >
                    Este evento estÃ¡ com lista de espera. Ao confirmar, sua vaga
                    vai automaticamente para a prÃ³xima pessoa da fila, que serÃ¡
                    inscrita e avisada por e-mail e pelo sino do portal.
                  </p>
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setModalCancelamento(false)}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-deep/20 px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalCancelamento(false);
                        formCancelar.current?.requestSubmit();
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-brick px-4 text-xs font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                    >
                      Sim, cancelar inscriÃ§Ã£o
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {mensagem ? (
          <p
            role="status"
            aria-live="polite"
            className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
              mensagem.ok
                ? "bg-steel-50 text-deep"
                : "bg-ember-50 text-molten"
            }`}
          >
            {mensagem.mensagem}
          </p>
        ) : null}

        <CardParticipacao
          inscricaoId={inscricao.id}
          aberto={cardVisivel}
          onFechar={fecharCard}
        />
      </div>
    );
  }

  if (inscricao?.status === "aguardando_confirmacao") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-brick bg-ember-50 px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-molten">
            <IconeAlerta className="h-4 w-4" />
            Vaga reservada para vocÃª
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink">
            Abriu uma vaga!
            {conviteExpiraEm
              ? ` Confirme atÃ© ${formatarDataHora(conviteExpiraEm)}.`
              : " Confirme sua participaÃ§Ã£o."}{" "}
            Se o prazo passar, a vaga vai automaticamente para a prÃ³xima pessoa
            da lista de espera.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <form action={acaoResponderConvite}>
            <input type="hidden" name="inscricao_id" value={inscricao.id} />
            <input type="hidden" name="evento_id" value={eventoId} />
            <input type="hidden" name="aceitar" value="true" />
            <button
              type="submit"
              disabled={respondendoConvite}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-deep px-4 text-xs font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconeCheck className="h-4 w-4" />
              {respondendoConvite ? "Enviando..." : "Confirmar minha vaga"}
            </button>
          </form>

          <form action={acaoResponderConvite}>
            <input type="hidden" name="inscricao_id" value={inscricao.id} />
            <input type="hidden" name="evento_id" value={eventoId} />
            <input type="hidden" name="aceitar" value="false" />
            <button
              type="submit"
              disabled={respondendoConvite}
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-deep/20 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
            >
              NÃ£o vou poder ir
            </button>
          </form>
        </div>

        {estadoConvite ? (
          <p
            role="status"
            aria-live="polite"
            className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
              estadoConvite.ok
                ? "bg-steel-50 text-deep"
                : "bg-ember-50 text-molten"
            }`}
          >
            {estadoConvite.mensagem}
          </p>
        ) : null}
      </div>
    );
  }

  if (inscricao?.status === "lista_espera") {
    return (
      <div className="space-y-2 rounded-xl border border-brick/30 bg-papaya px-4 py-3 text-sm leading-relaxed text-molten">
        <p className="font-semibold">
          VocÃª estÃ¡ na lista de espera
          {posicaoFila ? ` â€” ${posicaoFila}Âº da fila` : ""}.
        </p>
        <p className="text-xs leading-relaxed text-ink">
          Se uma vaga abrir, vocÃª recebe um e-mail e um aviso no sino do portal
          com um prazo para confirmar (24 horas, ou 6 horas se o evento estiver
          prÃ³ximo). Se o prazo passar sem confirmaÃ§Ã£o, a vaga vai para a prÃ³xima
          pessoa da fila.
        </p>
      </div>
    );
  }

  if (situacao !== "aberta" && !podeListaEspera) return null;

  return (
    <div>
      <form action={acaoInscrever}>
        <input type="hidden" name="evento_id" value={eventoId} />
        <button
          type="submit"
          disabled={inscrevendo}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-60"
        >
          {inscrevendo
            ? "Registrando..."
            : podeListaEspera
              ? "Entrar na lista de espera"
              : "Confirmar inscriÃ§Ã£o"}
          <IconeCheck className="h-4 w-4" />
        </button>
      </form>

      {podeListaEspera ? (
        <p className="mt-2 text-center text-xs leading-relaxed text-muted">
          As vagas estÃ£o preenchidas. Na lista de espera, vocÃª Ã© avisado por
          e-mail se uma vaga for liberada.
        </p>
      ) : null}

      {inscricao?.status === "cancelada" ? (
        <p className="mt-2 text-center text-xs text-muted">
          Sua inscriÃ§Ã£o anterior foi cancelada. VocÃª pode se inscrever novamente.
        </p>
      ) : null}

      {mensagem ? (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed ${
            mensagem.ok ? "bg-steel-50 text-deep" : "bg-ember-50 text-molten"
          }`}
        >
          {mensagem.mensagem}
        </p>
      ) : null}

      {inscricaoRecemConfirmada && estadoInscricao?.inscricaoId ? (
        <CardParticipacao
          inscricaoId={estadoInscricao.inscricaoId}
          aberto={cardVisivel}
          onFechar={fecharCard}
        />
      ) : null}
    </div>
  );
}
