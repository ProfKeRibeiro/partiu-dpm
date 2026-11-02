"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function caminhoSeguro(valor: FormDataEntryValue | null) {
  const caminho = typeof valor === "string" ? valor.trim() : "";

  return caminho.startsWith("/") && !caminho.startsWith("//")
    ? caminho
    : "/conta";
}

/**
 * Marca uma notificação como lida e leva ao destino (inscrições ou
 * certificados). A RLS garante que o usuário só altera as próprias linhas.
 */
export async function marcarNotificacaoLida(formData: FormData) {
  const id = String(formData.get("notificacao_id") ?? "");
  const destino = caminhoSeguro(formData.get("href"));
  const retorno = caminhoSeguro(formData.get("retorno"));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar?next=/conta");

  if (!REGEX_UUID.test(id)) redirect(retorno);

  const { error } = await supabase
    .from("notificacoes")
    .update({ lida_em: new Date().toISOString() })
    .eq("id", id)
    .is("lida_em", null);

  if (error) {
    console.error("[partiu-dpm] Falha ao marcar notificação como lida.", error);
  }

  revalidatePath("/conta");
  redirect(destino);
}

/** Marca todas as notificações pendentes e volta para a página atual. */
export async function marcarTodasNotificacoesLidas(formData: FormData) {
  const retorno = caminhoSeguro(formData.get("retorno"));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar?next=/conta");

  const { error } = await supabase
    .from("notificacoes")
    .update({ lida_em: new Date().toISOString() })
    .is("lida_em", null);

  if (error) {
    console.error(
      "[partiu-dpm] Falha ao marcar todas as notificações como lidas.",
      error,
    );
  }

  revalidatePath("/conta");
  redirect(retorno);
}
