"use client";

import { useEffect } from "react";

/**
 * Menu de acessibilidade do UserWay.
 *
 * O widget só é carregado quando `NEXT_PUBLIC_USERWAY_ID` está definido; sem
 * isso, nada é injetado na página. O domínio cdn.userway.org está liberado no
 * Content-Security-Policy.
 */
export function AcessibilidadeUserWay() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_USERWAY_ID?.trim();

    if (!id) return;
    if (document.querySelector("script[data-userway]")) return;

    const script = document.createElement("script");
    script.src = "https://cdn.userway.org/widget.js";
    script.async = true;
    script.setAttribute("data-account", id);
    script.setAttribute("data-userway", "true");
    script.onerror = () => {
      console.error("[partiu-dpm] Não foi possível carregar o UserWay.");
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
