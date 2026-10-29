import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabasePublicConfig,
  isSupabaseConfigured,
} from "@/lib/env";

/**
 * Rotas que exigem sessão. A checagem aqui é apenas de presença de sessão:
 * a autorização de administrador continua sendo feita no servidor e no banco
 * (`eh_admin()`), nunca no proxy.
 */
const ROTAS_PROTEGIDAS = ["/conta", "/admin"] as const;

function rotaProtegida(pathname: string) {
  return ROTAS_PROTEGIDAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}

function respostaComCookies(base: NextResponse, cookies: NextResponse["cookies"]) {
  cookies.getAll().forEach((cookie) => base.cookies.set(cookie));
  return base;
}

/**
 * Renova a sessão do Supabase e devolve a resposta com os cookies atualizados.
 * Chamado pelo proxy em todas as rotas que não são assets estáticos.
 */
export async function atualizarSessao(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  let resposta = NextResponse.next({ request });

  const { url, anonKey } = getSupabasePublicConfig();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaDefinir, headers) {
        cookiesParaDefinir.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        resposta = NextResponse.next({ request });

        cookiesParaDefinir.forEach(({ name, value, options }) => {
          resposta.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([chave, valor]) => {
          resposta.headers.set(chave, valor);
        });
      },
    },
  });

  let autenticado = false;

  try {
    // Valida/renova o token antes que a resposta seja enviada.
    const { data } = await supabase.auth.getClaims();
    autenticado = typeof data?.claims?.sub === "string";
  } catch {
    // Uma falha de rede ou de configuração não deve derrubar as páginas
    // públicas. A autorização real é sempre verificada no servidor/banco.
  }

  if (!autenticado && rotaProtegida(request.nextUrl.pathname)) {
    const destino = request.nextUrl.clone();
    const proximo = `${request.nextUrl.pathname}${request.nextUrl.search}`;

    destino.pathname = "/entrar";
    destino.search = `?next=${encodeURIComponent(proximo)}`;

    return respostaComCookies(NextResponse.redirect(destino), resposta.cookies);
  }

  return resposta;
}
