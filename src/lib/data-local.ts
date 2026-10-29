const FUSO = "America/Sao_Paulo";

const REGEX_DATA_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

const formatadorPartes = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Converte o valor de um input `datetime-local` (horário de São Paulo) para
 * ISO 8601 em UTC, que é o formato aceito por `timestamptz`.
 */
export function dataLocalParaIso(valor: string): string | null {
  const texto = valor.trim();
  if (!REGEX_DATA_LOCAL.test(texto)) return null;

  const comSegundos = texto.length === 16 ? `${texto}:00` : texto;
  const data = new Date(`${comSegundos}-03:00`);

  if (Number.isNaN(data.getTime())) return null;

  return data.toISOString();
}

/**
 * Caminho inverso: transforma um instante ISO no valor exibido pelo input
 * `datetime-local`, sempre no fuso de São Paulo.
 */
export function isoParaDataLocal(valor: string | null | undefined): string {
  if (!valor) return "";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";

  const partes = formatadorPartes.formatToParts(data);
  const mapa = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );

  return `${mapa.year}-${mapa.month}-${mapa.day}T${mapa.hour}:${mapa.minute}`;
}
