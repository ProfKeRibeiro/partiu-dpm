"use client";

import { useEffect, useRef, useState } from "react";
import { IconeFechar } from "@/components/ui/icons";
import { useDialogoAcessivel } from "@/components/ui/use-dialogo";

const TEXTO_ERRO = "Não foi possível gerar o card agora. Tente novamente em instantes.";

/**
 * Card de confirmação de participação para Instagram Story ("Estou dentro!").
 *
 * Modal acessível (mesmo contrato do diálogo de cancelamento): foco preso no
 * painel, ESC fecha, bloqueio de rolagem do fundo. Busca o PNG em
 * `/api/card/[inscricaoId]`, mostra o preview e oferece compartilhar (Web Share
 * API com o arquivo) ou baixar a imagem.
 */
export function CardParticipacao({
  inscricaoId,
  aberto,
  onFechar,
}: {
  inscricaoId: string;
  aberto: boolean;
  onFechar: () => void;
}) {
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const painelModal = useRef<HTMLDivElement>(null);
  const [abertoAnterior, setAbertoAnterior] = useState(aberto);

  /* Ajusta o estado quando o modal fecha (padrão React para derivar estado de
   * props/mestres): sem efeito, sem cascata de render. */
  if (aberto !== abertoAnterior) {
    setAbertoAnterior(aberto);
    if (!aberto) {
      setUrlPreview(null);
      setArquivo(null);
      setErro(false);
      setCarregando(false);
    }
  }

  useDialogoAcessivel({
    aberto,
    onFechar,
    painelRef: painelModal,
  });

  useEffect(() => {
    if (!aberto) return;

    let urlObjeto: string | null = null;
    let cancelado = false;

    async function carregarCard() {
      setCarregando(true);
      setErro(false);

      try {
        const resposta = await fetch(`/api/card/${inscricaoId}`, {
          cache: "no-store",
        });

        if (!resposta.ok) throw new Error("card_indisponivel");

        const blob = await resposta.blob();
        urlObjeto = URL.createObjectURL(blob);

        if (cancelado) {
          URL.revokeObjectURL(urlObjeto);
          return;
        }

        setUrlPreview(urlObjeto);
        setArquivo(
          new File([blob], `partiu-dpm-card-${inscricaoId}.png`, { type: "image/png" }),
        );
      } catch {
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    carregarCard();

    return () => {
      cancelado = true;
      if (urlObjeto) URL.revokeObjectURL(urlObjeto);
    };
  }, [aberto, inscricaoId]);

  if (!aberto) return null;

  function baixarImagem() {
    if (!urlPreview) return;

    const link = document.createElement("a");
    link.href = urlPreview;
    link.download = `partiu-dpm-card-${inscricaoId}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function compartilharImagem() {
    if (
      arquivo &&
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function"
    ) {
      const dados = {
        files: [arquivo],
        title: "Partiu DPM",
        text: "Partiu na festa! Confira o card de confirmação.",
      };

      if (navigator.canShare(dados)) {
        try {
          await navigator.share(dados);
          return;
        } catch {
          /* usuário cancelou ou indisponibilidade: cai no download */
        }
      }
    }

    baixarImagem();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep/70 p-4 sm:items-center"
      onClick={onFechar}
    >
      <div
        ref={painelModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-participacao-titulo"
        aria-describedby="card-participacao-descricao"
        tabIndex={-1}
        onClick={(evento) => evento.stopPropagation()}
        className="w-full max-w-[420px] rounded-2xl border border-deep/10 bg-white p-4 text-left shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              id="card-participacao-titulo"
              className="font-display text-lg font-semibold tracking-tight text-deep"
            >
              Estou dentro!
            </h2>
            <p
              id="card-participacao-descricao"
              className="mt-1 text-xs leading-relaxed text-muted"
            >
              Card 1080x1920 com a sua foto para o story do Instagram.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar card de confirmação"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-deep transition-colors hover:bg-papaya focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
          >
            <IconeFechar className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-deep/10 bg-deep">
          {urlPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlPreview}
              alt="Card de confirmação de participação do evento"
              className="max-h-[45vh] w-full rounded-xl object-contain"
            />
          ) : (
            <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-papaya">
              {carregando ? "Gerando card..." : erro ? TEXTO_ERRO : "Card indisponível."}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            data-foco-inicial
            onClick={compartilharImagem}
            disabled={!arquivo}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-deep px-4 text-xs font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            Compartilhar no Instagram
          </button>
          <button
            type="button"
            onClick={baixarImagem}
            disabled={!urlPreview}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-deep/20 bg-white px-4 text-xs font-semibold text-deep transition-colors hover:bg-papaya focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            Baixar imagem
          </button>
        </div>
      </div>
    </div>
  );
}
