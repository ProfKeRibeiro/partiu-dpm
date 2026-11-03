"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { destinoSeguroInterno } from "@/lib/rota-segura";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TIPOS_VALIDOS: ReadonlySet<string> = new Set<EmailOtpType>([
  "recovery",
  "signup",
  "invite",
  "magiclink",
  "email_change",
  "email",
]);

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Verifica o token do e-mail somente no POST.
 *
 * O GET de `/auth/confirm` só redireciona para cá; assim um scanner que abre o
 * link não queima o token. Falha volta para `/entrar?erro=link`, onde a página
 * explica que o link expirou ou já foi usado.
 */
export async function confirmarAcesso(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/entrar?erro=config");
  }

  const tokenHash = texto(formData, "token_hash");
  const tipo = texto(formData, "type");
  const destino = destinoSeguroInterno(formData.get("next"));

  if (!tokenHash || !TIPOS_VALIDOS.has(tipo)) {
    redirect("/entrar?erro=link");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: tipo as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    redirect("/entrar?erro=link");
  }

  redirect(destino);
}
