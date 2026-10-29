import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  isSupabaseConfigured,
} from "@/lib/env";

let cliente: SupabaseClient | null = null;

/**
 * Cliente anônimo usado apenas para leituras públicas (eventos publicados).
 *
 * Não guarda sessão e não lê cookies, então pode ser usado em qualquer
 * Server Component. A RLS continua sendo aplicada pelo banco com o papel
 * `anon` — esta camada não substitui as políticas de segurança.
 */
export function createSupabasePublicClient() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado.");
  }

  if (cliente) return cliente;

  const { url, anonKey } = getSupabasePublicConfig();
  cliente = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cliente;
}
