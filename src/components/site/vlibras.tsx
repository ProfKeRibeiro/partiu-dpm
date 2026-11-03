"use client";

import { useEffect } from "react";

/**
 * Tradutor de Libras oficial do governo (VLibras).
 *
 * O loader é servido pelo próprio portal (`/vlibras/vlibras-plugin.js`, versão
 * 7.12.2, ver README na pasta) para não depender de vlibras.gov.br nem de CDN
 * no carregamento da página. O widget em si continua buscando o aplicativo e
 * os avatares em vlibras.gov.br depois que a pessoa abre o tradutor.
 *
 * O widget é montado no cliente, depois da hidratação, para não interferir no
 * HTML renderizado no servidor.
 */
export function Vlibras() {
  useEffect(() => {
    if (document.querySelector("script[data-vlibras]")) return;

    const script = document.createElement("script");
    script.src = "/vlibras/vlibras-plugin.js";
    script.async = true;
    script.dataset.vlibras = "true";
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
