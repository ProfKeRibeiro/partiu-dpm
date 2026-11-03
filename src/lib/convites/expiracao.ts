import "server-only";

import { adminConfigurado } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { expirarConvitesCron } from "@/lib/email/promocao";

/**
 * Aproveita a visita a uma página para expirar convites vencidos e convocar a
 * próxima pessoa da fila, sem esperar a rotina diária.
 *
 * Roda com `service_role` porque o visitante pode ser anônimo. A RPC só age em
 * convites realmente vencidos, então visitas seguidas não geram efeito.
 */
export async function expirarConvitesNaVisita() {
  if (!isSupabaseConfigured || !adminConfigurado()) return;

  try {
    await expirarConvitesCron();
  } catch (erro) {
    console.error("[partiu-dpm] Falha ao expirar convites na visita.", erro);
  }
}
