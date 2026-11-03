"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent, type SVGProps } from "react";
import { IconeAlerta, IconeCheck } from "@/components/ui/icons";
import { enviarImagemEvento } from "@/lib/admin/eventos-acoes";

/* Seta de envio desenhada aqui para não alterar o catálogo de ícones. */
function IconeEnviar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};
const MARCADOR_BUCKET = "/storage/v1/object/public/eventos/";

const campo =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-sm text-deep outline-none transition focus:border-brick focus:ring-4 focus:ring-brick/10";
const rotulo = "block text-sm font-semibold text-deep";

/** Aceita `{ url }` do contrato atual da ação. */

/**
 * Capa do evento: envio de arquivo para o bucket `eventos` e edição manual da
 * URL (eventos antigos ou imagens hospedadas fora do portal).
 *
 * O botão de envio é `type="button"` de propósito: o componente vive dentro do
 * formulário de evento, e um `<form>` aninhado quebraria o envio principal. A
 * URL escolhida entra no campo `imagem_url`, que é o que `salvarEvento` lê.
 */
export function ImagemDoEvento({
  valorInicial,
  className = "",
}: {
  valorInicial: string | null;
  className?: string;
}) {
  const [url, setUrl] = useState(valorInicial ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const urlValida = /^(https?:\/\/|\/)/i.test(url.trim());
  const enviadaPeloPortal = url.includes(MARCADOR_BUCKET);
  const situacao = !urlValida
    ? "Sem imagem de capa."
    : enviadaPeloPortal
      ? "Em uso: imagem enviada pelo portal."
      : "Em uso: URL externa informada manualmente.";

  function selecionarArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0] ?? null;
    setArquivo(escolhido);
    setErro("");
    setMensagem("");
  }

  async function enviar() {
    setErro("");
    setMensagem("");

    const escolhido = arquivo ?? inputRef.current?.files?.[0] ?? null;

    if (!escolhido) {
      setErro("Escolha um arquivo de imagem antes de enviar.");
      return;
    }

    if (!TIPOS[escolhido.type]) {
      setErro("A imagem precisa ser JPG, PNG ou WebP.");
      return;
    }

    if (escolhido.size > MAX_BYTES) {
      setErro("A imagem deve ter no máximo 5 MB.");
      return;
    }

    const dados = new FormData();
    /* A ação lê o campo `arquivo` (src/lib/admin/eventos-acoes.ts). */
    dados.append("arquivo", escolhido);

    setEnviando(true);

    try {
      const retorno = await enviarImagemEvento(dados);

      if (!retorno) {
        setErro("O envio não devolveu resposta. Tente novamente.");
        return;
      }

      if ("erro" in retorno) {
        setErro(retorno.erro);
        return;
      }

      setUrl(retorno.url);
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      setMensagem("Imagem enviada. Salve o evento para aplicar a nova capa.");
    } catch {
      setErro("Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={rotulo}>Imagem de capa</p>
        <p className="text-xs text-muted">{situacao}</p>
      </div>

      <div className="mt-2 grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-deep/10 bg-canvas">
          {urlValida ? (
            <Image
              src={url}
              alt="Prévia da imagem de capa do evento"
              fill
              unoptimized
              sizes="220px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted">
              Nenhuma imagem selecionada
            </span>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <label
              htmlFor="arquivo-imagem-evento"
              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep transition-colors hover:bg-papaya/60 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brick motion-reduce:transition-none"
            >
              Escolher arquivo
              <input
                ref={inputRef}
                id="arquivo-imagem-evento"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selecionarArquivo}
                aria-describedby="ajuda-imagem-evento"
                className="sr-only"
              />
            </label>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={enviar}
                disabled={enviando || !arquivo}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-deep px-4 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                <IconeEnviar className="h-4 w-4" />
                {enviando ? "Enviando…" : "Enviar imagem"}
              </button>

              {arquivo ? (
                <span className="max-w-full truncate text-xs text-muted">
                  {arquivo.name}
                </span>
              ) : null}
            </div>

            <p id="ajuda-imagem-evento" className="mt-2 text-xs leading-relaxed text-muted">
              JPG, PNG ou WebP, até 5 MB. O arquivo é validado também no
              servidor antes de ser publicado.
            </p>
          </div>

          <div>
            <label htmlFor="imagem_url" className={rotulo}>
              URL da imagem (alternativa)
            </label>
            <input
              id="imagem_url"
              name="imagem_url"
              type="url"
              maxLength={500}
              value={url}
              onChange={(evento) => setUrl(evento.target.value)}
              className={campo}
              placeholder="https://..."
              aria-describedby="ajuda-imagem-url"
            />
            <p id="ajuda-imagem-url" className="mt-1.5 text-xs leading-relaxed text-muted">
              Para eventos antigos ou imagens hospedadas fora do portal. Ao
              enviar um arquivo, este campo é preenchido automaticamente.
            </p>
          </div>

          {url ? (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                setErro("");
                setMensagem("");
              }}
              className="text-xs font-semibold text-brick underline underline-offset-4 transition-colors hover:text-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick motion-reduce:transition-none"
            >
              Remover imagem
            </button>
          ) : null}
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          mensagem
            ? "mt-3 inline-flex items-start gap-2 rounded-xl border border-steel-300 bg-steel-50 px-3 py-2 text-xs font-medium text-deep"
            : "sr-only"
        }
      >
        {mensagem ? <IconeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
        {mensagem}
      </p>

      <p
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={
          erro
            ? "mt-3 inline-flex items-start gap-2 rounded-xl border border-ember-400/40 bg-ember-50 px-3 py-2 text-xs font-medium text-molten"
            : "sr-only"
        }
      >
        {erro ? <IconeAlerta className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
        {erro}
      </p>
    </div>
  );
}
