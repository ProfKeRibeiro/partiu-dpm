import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 *
 * Deve ser criado uma vez por requisição. Em Server Components o cookie store
 * é somente leitura; por isso a escrita é ignorada quando não é permitida.
 * A renovação de sessão acontece no proxy.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components não podem escrever cookies. O proxy é
          // responsável por renovar a sessão nesse fluxo.
        }
      },
    },
  });
}
