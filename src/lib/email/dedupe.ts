import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Libera o registro de deduplicação quando o envio falha ou o fluxo é
 * interrompido antes do envio.
 *
 * `registrar_aviso_email` grava a linha antes do envio (para o duplo clique não
 * mandar dois e-mails) e devolve o id. Se o provedor recusar, a rede cair ou o
 * fluxo sair sem enviar, apagamos exatamente aquela linha com `service_role`,
 * para a próxima ação poder tentar de novo em vez de esperar a janela de 5
 * minutos sem nenhum aviso.
 */
export async function liberarAviso(avisoId: string | null | undefined) {
  if (!avisoId) return;

  const admin = createSupabaseAdminClient();

  if (!admin) {
    console.warn(
      "[partiu-dpm] SUPABASE_SERVICE_ROLE_KEY ausente: aviso não liberado para nova tentativa.",
    );
    return;
  }

  const { error } = await admin.rpc("liberar_aviso_email", {
    p_aviso_id: avisoId,
  });

  if (error) {
    console.warn(
      "[partiu-dpm] Não foi possível liberar o aviso para nova tentativa.",
      error.message,
    );
  }
}
