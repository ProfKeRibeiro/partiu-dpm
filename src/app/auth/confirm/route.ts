import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { destinoSeguroInterno } from "@/lib/rota-segura";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Recebe os links enviados pelo Supabase Auth (confirmação de cadastro e
 * recuperação de senha) e troca o `code` por uma sessão antes de seguir.
 *
 * Sem essa troca o usuário cairia em `/entrar` sem sessão e com um `?code=`
 * inútil na URL. O destino final vem em `next` e só aceita caminhos internos.
 */
function falha(request: NextRequest, motivo: string) {
  const url = new URL("/entrar", request.nextUrl.origin);
  url.searchParams.set("erro", motivo);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return falha(request, "config");
  }

  const params = request.nextUrl.searchParams;

  if (params.get("error") || params.get("error_code")) {
    return falha(
      request,
      params.get("error_code") === "otp_expired" ? "expirado" : "link",
    );
  }

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const tipo = params.get("type") as EmailOtpType | null;
  const destino = destinoSeguroInterno(params.get("next"));

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(destino, request.nextUrl.origin));
    }
  } else if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({
      type: tipo,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(destino, request.nextUrl.origin));
    }
  }

  return falha(request, "link");
}
