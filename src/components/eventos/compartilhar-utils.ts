/**
 * Texto e URLs de compartilhamento de um evento.
 *
 * Centralizado para o painel do evento, o card da agenda e a home usarem a
 * mesma mensagem e os mesmos parâmetros de WhatsApp e Facebook.
 */

export function mensagemDoEvento({
  titulo,
  periodo,
  local,
  prefixo = "Participe do evento",
}: {
  titulo: string;
  /** Período já formatado, por exemplo "02/11/2026 · 21h às 21h35". */
  periodo: string;
  local: string;
  /** "Participe do evento" no futuro; "Confira o evento" no passado. */
  prefixo?: string;
}) {
  return `${prefixo} ${titulo} na Etec DPM! ${periodo} · ${local}.`;
}

/** Mensagem + convite de inscrição com a URL absoluta do evento. */
export function textoCompartilhavel(mensagem: string, url: string) {
  return `${mensagem} Inscreva-se: ${url}`;
}

export function urlWhatsApp(mensagem: string, url: string) {
  return `https://wa.me/?text=${encodeURIComponent(
    textoCompartilhavel(mensagem, url),
  )}`;
}

export function urlFacebook(mensagem: string, url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url,
  )}&quote=${encodeURIComponent(textoCompartilhavel(mensagem, url))}`;
}
