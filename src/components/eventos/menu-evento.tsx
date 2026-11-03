"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  IconeCopiar,
  IconeFacebook,
  IconeInstagram,
  IconeMaisOpcoes,
  IconeWhatsApp,
} from "@/components/ui/icons";
import {
  textoCompartilhavel,
  urlFacebook,
  urlWhatsApp,
} from "@/components/eventos/compartilhar-utils";

const ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-papaya/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brick motion-reduce:transition-none";

/**
 * Menu de três pontinhos do card de evento.
 *
 * Vive fora do link que cobre o card (o link usa um `::after` absoluto), então
 * o botão é um irmão posicionado com z-index — nada de botão dentro de `<a>`.
 * Reutiliza a mesma mensagem e as mesmas URLs do painel do evento.
 */
export function MenuDoEvento({
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
  /** URL absoluta usada antes da hidratação e no clique com modificador. */
  urlInicial: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState("");
  const raizRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const ponteiroRef = useRef(false);
  const idMenu = useId();

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: globalThis.MouseEvent) {
      if (!raizRef.current?.contains(evento.target as Node)) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", aoClicarFora);

    menuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto]);

  function fechar(devolverFoco = true) {
    setAberto(false);
    if (devolverFoco) {
      /* Depois do commit: focar durante o keydown que fecha o menu deixa o
       * próximo clique sem efeito. */
      requestAnimationFrame(() =>
        botaoRef.current?.focus({ preventScroll: true }),
      );
    }
  }

  function anunciar(texto: string) {
    setAviso(texto);

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setAviso(""), 5000);
  }

  function urlAtual() {
    if (typeof window === "undefined") return urlInicial;
    return `${window.location.origin}${caminho}`;
  }

  function aoTeclarMenu(evento: KeyboardEvent<HTMLDivElement>) {
    const itens = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );

    if (itens.length === 0) return;

    const indice = itens.indexOf(document.activeElement as HTMLElement);

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      itens[(indice + 1) % itens.length].focus();
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      itens[(indice - 1 + itens.length) % itens.length].focus();
    } else if (evento.key === "Home") {
      evento.preventDefault();
      itens[0].focus();
    } else if (evento.key === "End") {
      evento.preventDefault();
      itens[itens.length - 1].focus();
    } else if (evento.key === "Tab") {
      setAberto(false);
    }
  }

  function aoClicarLink(evento: MouseEvent<HTMLAnchorElement>, url: string) {
    if (
      evento.button !== 0 ||
      evento.metaKey ||
      evento.ctrlKey ||
      evento.shiftKey ||
      evento.altKey
    ) {
      setAberto(false);
      return;
    }

    evento.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer");
    fechar();
  }

  async function copiarLink() {
    const url = urlAtual();
    fechar();

    try {
      await navigator.clipboard.writeText(url);
      anunciar("Link copiado!");
    } catch {
      anunciar("Não foi possível copiar o link.");
    }
  }

  async function compartilharInstagram() {
    const url = urlAtual();
    const texto = textoCompartilhavel(mensagem, url);
    fechar();

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

  /* Versão estável para o href: usa a URL do servidor, para o HTML do servidor
   * e a primeira renderização no cliente serem iguais (sem erro de hidratação).
   * O clique recalcula com a origem real. */
  return (
    <div
      ref={raizRef}
      className={`absolute z-30 ${className}`}
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && aberto) {
          evento.preventDefault();
          evento.stopPropagation();
          fechar();
        }
      }}
    >
      <button
        ref={botaoRef}
        type="button"
        aria-label="Mais opções do evento"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? idMenu : undefined}
        onPointerDown={(evento) => {
          if (evento.pointerType !== "mouse" || evento.button !== 0) return;

          /* Abre no ponteiro: depois do foco devolvido pelo Esc, o clique
           * sintético nem sempre chega ao React. O `click` seguinte é
           * ignorado para não alternar duas vezes; o teclado continua no
           * `click`. */
          ponteiroRef.current = true;
          window.setTimeout(() => {
            ponteiroRef.current = false;
          }, 500);

          if (aberto) {
            fechar(false);
          } else {
            setAberto(true);
          }
        }}
        onClick={() => {
          if (ponteiroRef.current) {
            ponteiroRef.current = false;
            return;
          }

          if (aberto) {
            fechar(false);
          } else {
            setAberto(true);
          }
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-deep/10 bg-white/85 text-deep shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick motion-reduce:transition-none"
      >
        <IconeMaisOpcoes className="h-4 w-4" />
      </button>

      {aberto ? (
        <div
          ref={menuRef}
          id={idMenu}
          role="menu"
          aria-label={`Opções do evento ${titulo}`}
          onKeyDown={aoTeclarMenu}
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-deep/10 bg-white p-1.5 shadow-elevada"
        >
          <a
            role="menuitem"
            href={urlWhatsApp(mensagem, urlInicial)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(evento) =>
              aoClicarLink(evento, urlWhatsApp(mensagem, urlAtual()))
            }
            className={ITEM}
          >
            <IconeWhatsApp className="h-4 w-4 shrink-0 text-[#128c7e]" />
            WhatsApp
          </a>

          <a
            role="menuitem"
            href={urlFacebook(mensagem, urlInicial)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(evento) =>
              aoClicarLink(evento, urlFacebook(mensagem, urlAtual()))
            }
            className={ITEM}
          >
            <IconeFacebook className="h-4 w-4 shrink-0 text-[#1877f2]" />
            Facebook
          </a>

          <button
            type="button"
            role="menuitem"
            onClick={compartilharInstagram}
            className={ITEM}
          >
            <IconeInstagram className="h-4 w-4 shrink-0 text-[#c1121f]" />
            Instagram
          </button>

          <div className="my-1 border-t border-line" aria-hidden="true" />

          <button
            type="button"
            role="menuitem"
            onClick={copiarLink}
            className={ITEM}
          >
            <IconeCopiar className="h-4 w-4 shrink-0 text-steel-700" />
            Copiar link
          </button>
        </div>
      ) : null}

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          aviso
            ? "absolute right-0 top-full z-40 mt-2 w-max max-w-56 rounded-lg bg-deep px-3 py-2 text-xs font-medium text-papaya shadow-elevada"
            : "sr-only"
        }
      >
        {aviso}
      </p>
    </div>
  );
}
