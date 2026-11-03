"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  IconeFacebook,
  IconeInstagram,
  IconeWhatsApp,
} from "@/components/ui/icons";

const BOTAO =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep transition-colors hover:border-deep/35 hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick motion-reduce:transition-none";

/**
 * Três caminhos de divulgação do evento.
 *
 * WhatsApp e Facebook usam URL de compartilhamento com texto pronto. O
 * Instagram não aceita texto por URL: usamos a Web Share API (o menu do
 * celular inclui o Instagram) e, sem ela, copiamos a mensagem e abrimos o
 * Instagram em outra aba.
 */
export function CompartilharEvento({
  titulo,
  mensagem,
  caminho,
  urlInicial,
  className = "",
}: {
  titulo: string;
  /** Texto pronto, sem a URL e sem o convite de inscrição. */
  mensagem: string;
  /** Caminho interno do evento; a origem é resolvida no navegador. */
  caminho: string;
  /** URL absoluta do servidor, usada antes da hidratação e no botão direito. */
  urlInicial: string;
  className?: string;
}) {
  const [aviso, setAviso] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function anunciar(texto: string) {
    setAviso(texto);

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setAviso(""), 6000);
  }

  /** Usa a origem real da página, para funcionar também em prévias. */
  function urlAtual() {
    if (typeof window === "undefined") return urlInicial;
    return `${window.location.origin}${caminho}`;
  }

  function textoCompleto() {
    return `${mensagem} Inscreva-se: ${urlAtual()}`;
  }

  /* Versão estável para o href: usa sempre a URL do servidor, para o HTML
   * renderizado no servidor e a primeira renderização no cliente serem iguais
   * (sem aviso de hidratação). O clique recalcula com a origem real. */
  const textoEstavel = `${mensagem} Inscreva-se: ${urlInicial}`;

  function abrirComUrl(url: string) {
    return (evento: MouseEvent<HTMLAnchorElement>) => {
      if (
        evento.button !== 0 ||
        evento.metaKey ||
        evento.ctrlKey ||
        evento.shiftKey ||
        evento.altKey
      ) {
        return;
      }

      evento.preventDefault();
      window.open(url, "_blank", "noopener,noreferrer");
    };
  }

  async function compartilharInstagram() {
    const texto = textoCompleto();
    const url = urlAtual();

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: titulo, text: texto, url });
        anunciar("Compartilhado!");
      } catch (erro) {
        if (erro instanceof DOMException && erro.name === "AbortError") return;
        anunciar(
          "Não foi possível abrir o compartilhamento. Use o WhatsApp ou o Facebook.",
        );
      }

      return;
    }

    /* Abrir a aba aqui, ainda dentro do clique, evita o bloqueio de pop-up. */
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");

    try {
      await navigator.clipboard.writeText(texto);
      anunciar("Mensagem copiada! Cole no Instagram");
    } catch {
      anunciar(
        "Não foi possível copiar a mensagem. Copie o link da página e cole no Instagram.",
      );
    }
  }

  return (
    <div className={className}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
        Compartilhar
      </p>

      <div
        role="group"
        aria-label="Compartilhar este evento"
        className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        <a
          href={`https://wa.me/?text=${encodeURIComponent(textoEstavel)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Compartilhar no WhatsApp (abre em nova aba)"
          className={BOTAO}
          onClick={abrirComUrl(
            `https://wa.me/?text=${encodeURIComponent(textoCompleto())}`,
          )}
        >
          <IconeWhatsApp className="h-4 w-4 text-[#128c7e]" />
          WhatsApp
        </a>

        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlInicial)}&quote=${encodeURIComponent(textoEstavel)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Compartilhar no Facebook (abre em nova aba)"
          className={BOTAO}
          onClick={abrirComUrl(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlAtual())}&quote=${encodeURIComponent(textoCompleto())}`,
          )}
        >
          <IconeFacebook className="h-4 w-4 text-[#1877f2]" />
          Facebook
        </a>

        <button
          type="button"
          onClick={compartilharInstagram}
          aria-label="Compartilhar no Instagram"
          className={BOTAO}
        >
          <IconeInstagram className="h-4 w-4 text-[#c1121f]" />
          Instagram
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          aviso ? "mt-2 text-xs font-medium text-deep" : "sr-only"
        }
      >
        {aviso}
      </p>
    </div>
  );
}
