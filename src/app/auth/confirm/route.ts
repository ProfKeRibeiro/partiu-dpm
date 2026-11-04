import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { garantirConsentimentosIniciais } from "@/lib/consentimentos/garantir";
import { isSupabaseConfigured } from "@/lib/env";
import { destinoSeguroInterno } from "@/lib/rota-segura";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Recebe os links enviados pelo Supabase Auth (confirmação de cadastro e
 * recuperação de senha).
 *
 * O GET nunca consome o `token_hash`: scanners do provedor de e-mail abrem o
 * link antes da pessoa e queimariam o token. Nesse caso o pedido só redireciona
 * para `/confirmar-acesso`, que mostra um botão; a verificação acontece no POST
 * da Server Action. O fluxo antigo por `code` (PKCE) continua igual.
 *
 * O destino final vem em `next` e só aceita caminhos internos.
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

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await garantirConsentimentosIniciais();
      return NextResponse.redirect(new URL(destino, request.nextUrl.origin));
    }

    return falha(request, "link");
  }

  if (tokenHash && tipo) {
    const url = new URL("/confirmar-acesso", request.nextUrl.origin);
    url.searchParams.set("token_hash", tokenHash);
    url.searchParams.set("type", tipo);

    if (params.get("next")) {
      url.searchParams.set("next", destino);
    }

    return NextResponse.redirect(url);
  }

  return falha(request, "link");
}
