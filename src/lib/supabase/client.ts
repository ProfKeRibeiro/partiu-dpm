"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/env";

let cliente: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Cliente Supabase para componentes do navegador.
 * A sessão é persistida em cookies para que o servidor também consiga lê-la.
 */
export function createSupabaseBrowserClient() {
  if (cliente) return cliente;

  const { url, anonKey } = getSupabasePublicConfig();
  cliente = createBrowserClient(url, anonKey);

  return cliente;
}
