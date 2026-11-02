const FUSO = "America/Sao_Paulo";

const formatadorDataCurta = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: FUSO,
});

const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: FUSO,
});

const formatadorDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: FUSO,
});

const formatadorMesCurto = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: FUSO,
});

export function formatarDataCurta(valor: string | null | undefined) {
  if (!valor) return "";
  return formatadorDataCurta.format(new Date(valor));
}

export function formatarDataExtensa(valor: string | null | undefined) {
  if (!valor) return "";
  return formatadorDataCurta.format(new Date(valor));
}

export function formatarDiaMes(valor: string | null | undefined) {
  if (!valor) return "";
  return formatadorDataCurta.format(new Date(valor));
}

export function formatarHorario(valor: string | null | undefined) {
  if (!valor) return "";

  const partes = formatadorHora.formatToParts(new Date(valor));
  const hora = partes.find((parte) => parte.type === "hour")?.value ?? "00";
  const minuto = partes.find((parte) => parte.type === "minute")?.value ?? "00";

  return minuto === "00" ? `${hora}h` : `${hora}h${minuto}`;
}

export function formatarDataHora(valor: string | null | undefined) {
  if (!valor) return "";
  return formatadorDataHora.format(new Date(valor));
}

export function partesDaData(valor: string) {
  const data = new Date(valor);

  return {
    dia: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      timeZone: FUSO,
    }).format(data),
    mes: formatadorMesCurto
      .format(data)
      .replace(".", "")
      .toUpperCase(),
  };
}

function mesmoDia(inicio: string, fim: string) {
  return formatarDataCurta(inicio) === formatarDataCurta(fim);
}

export function formatarPeriodo(inicio: string, fim: string | null) {
  if (!fim) return formatarDataCurta(inicio);

  if (mesmoDia(inicio, fim)) {
    return `${formatarDiaMes(inicio)} · ${formatarHorario(inicio)} às ${formatarHorario(fim)}`;
  }

  return `${formatarDataCurta(inicio)}, ${formatarHorario(inicio)} — ${formatarDataCurta(fim)}, ${formatarHorario(fim)}`;
}

export function formatarPeriodoInscricoes(
  inicio: string | null,
  fim: string | null,
) {
  if (inicio && fim) {
    return `De ${formatarDiaMes(inicio)} a ${formatarDiaMes(fim)}`;
  }

  if (fim) return `Até ${formatarDiaMes(fim)}`;
  if (inicio) return `A partir de ${formatarDiaMes(inicio)}`;

  return "Consulte a organização";
}
