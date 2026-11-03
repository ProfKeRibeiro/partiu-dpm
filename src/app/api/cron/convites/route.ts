import { NextResponse, type NextRequest } from "next/server";
import { expirarConvitesCron } from "@/lib/email/promocao";

/**
 * Rotina diária: expira convites de vaga vencidos e convoca a próxima pessoa da
 * lista de espera, mesmo sem ninguém acessar o portal.
 *
 * A Vercel envia `Authorization: Bearer <CRON_SECRET>` automaticamente quando a
 * variável existe no projeto.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET?.trim();
  const enviado = request.headers.get("authorization");

  if (!segredo || enviado !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const resultado = await expirarConvitesCron();

  return NextResponse.json(resultado);
}
