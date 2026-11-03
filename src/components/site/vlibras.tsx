"use client";

import { useEffect } from "react";

/**
 * Tradutor de Libras oficial do governo (VLibras).
 *
 * O widget é montado no cliente, depois da hidratação, para não interferir no
 * HTML renderizado no servidor. O script e os assets vêm de vlibras.gov.br e
 * estão liberados no Content-Security-Policy do projeto.
 */
export function Vlibras() {
  useEffect(() => {
    if (document.querySelector("[vw]")) return;

    const container = document.createElement("div");
    container.setAttribute("vw", "true");
    container.className = "enabled";
    container.innerHTML = [
      '<div vw-access-button class="active"></div>',
      '<div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>',
    ].join("");
    document.body.appendChild(container);

    const script = document.createElement("script");
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.async = true;
    script.onload = () => {
      const global = window as unknown as {
        VLibras?: { Widget: new (url: string) => unknown };
      };

      try {
        if (global.VLibras) {
          new global.VLibras.Widget("https://vlibras.gov.br/app");
        }
      } catch (erro) {
        console.error("[partiu-dpm] Falha ao iniciar o VLibras.", erro);
      }
    };
    script.onerror = () => {
      console.error("[partiu-dpm] Não foi possível carregar o VLibras.");
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
