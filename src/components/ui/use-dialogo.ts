"use client";

import { useEffect, useRef, type RefObject } from "react";

const SELETOR_FOCAVEL = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Comportamento de diálogo para overlays (drawer, modais e leitor de QR).
 *
 * Ao abrir: bloqueia a rolagem do fundo, move o foco para o primeiro elemento
 * focável (ou para `[data-foco-inicial]`) e prende o Tab dentro do painel.
 * Ao fechar: devolve o foco ao elemento que abriu o diálogo. `Escape` fecha.
 */
export function useDialogoAcessivel({
  aberto,
  onFechar,
  painelRef,
}: {
  aberto: boolean;
  onFechar: () => void;
  painelRef: RefObject<HTMLElement | null>;
}) {
  const fecharRef = useRef(onFechar);

  useEffect(() => {
    fecharRef.current = onFechar;
  });

  useEffect(() => {
    if (!aberto) return;

    const painelEncontrado = painelRef.current;
    if (!painelEncontrado) return;

    const painel: HTMLElement = painelEncontrado;

    const anterior =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    /* Quem rola a página é o elemento `html`, não o `body`. Reservar o espaço
     * da barra de rolagem antes de escondê-la evita o salto de layout. */
    const html = document.documentElement;
    const overflowHtmlAnterior = html.style.overflow;
    const gutterHtmlAnterior = html.style.scrollbarGutter;
    const overscrollAnterior = html.style.overscrollBehavior;
    const overflowBodyAnterior = document.body.style.overflow;

    html.style.scrollbarGutter = "stable";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "contain";
    document.body.style.overflow = "hidden";

    const focaveis = () =>
      Array.from(painel.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)).filter(
        (elemento) =>
          elemento.getAttribute("aria-hidden") !== "true" &&
          (elemento.offsetWidth > 0 ||
            elemento.offsetHeight > 0 ||
            elemento === document.activeElement),
      );

    const focoInicial =
      painel.querySelector<HTMLElement>("[data-foco-inicial]") ?? focaveis()[0];
    (focoInicial ?? painel).focus({ preventScroll: true });

    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        evento.stopPropagation();
        fecharRef.current();
        return;
      }

      if (evento.key !== "Tab") return;

      const itens = focaveis();

      if (itens.length === 0) {
        evento.preventDefault();
        painel.focus({ preventScroll: true });
        return;
      }

      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      const ativo = document.activeElement;

      if (evento.shiftKey && (ativo === primeiro || !painel.contains(ativo))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (
        !evento.shiftKey &&
        (ativo === ultimo || !painel.contains(ativo))
      ) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoPressionar, true);

    return () => {
      html.style.overflow = overflowHtmlAnterior;
      html.style.scrollbarGutter = gutterHtmlAnterior;
      html.style.overscrollBehavior = overscrollAnterior;
      document.body.style.overflow = overflowBodyAnterior;
      document.removeEventListener("keydown", aoPressionar, true);
      anterior?.focus({ preventScroll: true });
    };
  }, [aberto, painelRef]);
}
