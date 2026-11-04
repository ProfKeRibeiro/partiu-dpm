import "server-only";

import { headers } from "next/headers";

/**
 * IP e user agent da requisição para o registro do aceite.
 *
 * O banco não enxerga a requisição HTTP, então as Server Actions capturam esses
 * dados e passam como parâmetro para as RPCs.
 */
export async function dadosDaRequisicao() {
  const cabecalhos = await headers();
  const encaminhado = cabecalhos.get("x-forwarded-for");
  const ip =
    encaminhado?.split(",")[0]?.trim() ||
    cabecalhos.get("x-real-ip")?.trim() ||
    null;
  const userAgent = cabecalhos.get("user-agent")?.slice(0, 500) ?? null;

  return { ip, userAgent };
}
