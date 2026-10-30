"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
  IconeAtualizar,
  IconeCamera,
  IconeFechar,
  IconeQr,
} from "@/components/ui/icons";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type EstadoLeitor = {
  erro: string | null;
  lendo: boolean;
  nomeCamera: string | null;
};

/**
 * Lê o QR code do certificado com a câmera do dispositivo.
 *
 * A decodificação usa `jsqr` sobre os frames de `getUserMedia`, que funciona
 * nos navegadores atuais (câmera exige HTTPS ou localhost).
 */
export function LeitorQrCode() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervaloRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [aberto, setAberto] = useState(false);
  const [sessao, setSessao] = useState(0);
  const [estado, setEstado] = useState<EstadoLeitor>({
    erro: null,
    lendo: false,
    nomeCamera: null,
  });

  const interromper = useCallback(() => {
    if (intervaloRef.current !== null) {
      window.clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }

    streamRef.current?.getTracks().forEach((faixa) => faixa.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!aberto) return;

    const video = videoRef.current;
    if (!video) return;

    let vivo = true;
    let lida = false;

    const iniciar = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado({
          erro: "Este navegador não tem acesso à câmera. Use um navegador mais recente ou informe o código manualmente.",
          lendo: false,
          nomeCamera: null,
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!vivo) {
          stream.getTracks().forEach((faixa) => faixa.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        const canvas =
          canvasRef.current ?? (canvasRef.current = document.createElement("canvas"));
        const contexto = canvas.getContext("2d", {
          willReadFrequently: true,
        });

        let atraso = 0;
        intervaloRef.current = window.setInterval(() => {
          if (!vivo || lida) return;
          if (!streamRef.current || video.readyState < 2 || !contexto) return;
          // Descarta frames ociosos para poupar bateria.
          atraso = (atraso + 1) % 3;
          if (atraso !== 0) return;

          const largura = video.videoWidth;
          const altura = video.videoHeight;
          if (!largura || !altura) return;

          canvas.width = largura;
          canvas.height = altura;
          contexto.drawImage(video, 0, 0, largura, altura);

          const imagem = contexto.getImageData(0, 0, largura, altura);
          const resultado = jsQR(imagem.data, largura, altura, {
            inversionAttempts: "dontInvert",
          });

          if (resultado?.data) {
            const bruto = resultado.data.trim();
            // Aceita o código puro, um UUID solto no texto ou a URL completa.
            const encontrado = bruto.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];

            if (encontrado && REGEX_UUID.test(encontrado)) {
              lida = true;
              setEstado((atual) => ({ ...atual, erro: null }));
              router.push(
                `/certificados/${encontrado.toLowerCase()}`
              );
            }
          }
        }, 120);

        setEstado({ erro: null, lendo: true, nomeCamera: null });
      } catch (erro) {
        if (!vivo) return;
        const nome =
          erro instanceof DOMException ? erro.name : "Erro";
        setEstado({
          erro:
            nome === "NotAllowedError"
              ? "A câmera foi bloqueada. Autorize o acesso nas configurações do navegador e tente de novo."
              : nome === "NotFoundError"
                ? "Nenhuma câmera foi encontrada neste dispositivo."
                : "Não foi possível abrir a câmera. Informe o código manualmente.",
          lendo: false,
          nomeCamera: null,
        });
      }
    };

    iniciar();

    return () => {
      vivo = false;
      interromper();
    };
  }, [aberto, sessao, interromper, router]);

  useEffect(() => {
    return interromper;
  }, [interromper]);

  function aoPressionarTecla(evento: KeyboardEvent) {
    if (evento.key === "Escape") setAberto(false);
  }

  useEffect(() => {
    if (!aberto) return;
    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-deep/20 bg-white px-5 text-sm font-semibold text-deep transition-colors hover:border-deep/35 hover:bg-papaya/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <IconeQr className="h-4 w-4" />
        Escanear o QR code
      </button>

      {aberto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Leitor de QR code de certificado"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-deep text-papaya shadow-elevada">
            <button
              type="button"
              aria-label="Fechar leitor"
              onClick={() => setAberto(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-papaya/25 bg-deep/70 text-papaya transition-colors hover:bg-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papaya"
            >
              <IconeFechar className="h-4 w-4" />
            </button>

            <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="h-56 w-56 rounded-2xl border-2 border-papaya/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>

              {!estado.lendo && !estado.erro ? (
                <p className="absolute inset-x-0 bottom-6 text-center text-xs font-medium text-papaya/80">
                  Abrindo a câmera…
                </p>
              ) : null}
            </div>

            <div className="space-y-3 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <IconeCamera className="h-4 w-4" />
                Aponte para o QR do certificado
              </p>
              <p className="text-xs leading-relaxed text-papaya/75">
                O QR fica na caixa “QR code de validação”, no canto inferior
                esquerdo do certificado. Ao reconhecer, abrimos a validação.
              </p>

              {estado.erro ? (
                <p
                  role="alert"
                  className="rounded-xl border border-ember-300/50 bg-ember-50 px-3.5 py-2.5 text-xs leading-relaxed text-molten"
                >
                  {estado.erro}
                </p>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    interromper();
                    setEstado({ erro: null, lendo: false, nomeCamera: null });
                    setSessao((valor) => valor + 1);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-papaya/30 bg-papaya/10 px-4 text-xs font-semibold text-papaya transition-colors hover:bg-papaya/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papaya"
                >
                  <IconeAtualizar className="h-3.5 w-3.5" />
                  Recarregar câmera
                </button>
                {estado.lendo ? (
                  <span className="inline-flex h-9 items-center rounded-full border border-steel-300/60 bg-steel/15 px-4 text-xs font-semibold text-steel-300">
                    Buscando…
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
