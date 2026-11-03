import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/env";

let cliente: SupabaseClient | null = null;

export function adminConfigurado() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * Cliente com a chave `service_role`, usado apenas no servidor para operações
 * que precisam ler dados de outro usuário (por exemplo, o e-mail de quem foi
 * promovido da lista de espera). Nunca deve ser importado em componente
 * cliente: o `server-only` acima impede o build nesse caso.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!chave) return null;

  if (!cliente) {
    const { url } = getSupabasePublicConfig();
    cliente = createClient(url, chave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cliente;
}
