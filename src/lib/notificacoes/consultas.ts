import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Notificacao } from "@/types/notificacao";

const LIMITE_PADRAO = 10;

/**
 * Notificações do participante autenticado, mais recentes primeiro, com a
 * contagem total de não lidas. A RLS já limita as linhas ao próprio usuário.
 */
export async function listarNotificacoes(
  limite = LIMITE_PADRAO,
): Promise<{ itens: Notificacao[]; naoLidas: number }> {
  if (!isSupabaseConfigured) return { itens: [], naoLidas: 0 };

  const supabase = await createSupabaseServerClient();

  const [lista, contagem] = await Promise.all([
    supabase
      .from("notificacoes")
      .select("id, tipo, titulo, mensagem, href, lida_em, created_at")
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("notificacoes")
      .select("id", { count: "exact", head: true })
      .is("lida_em", null),
  ]);

  if (lista.error || !lista.data) {
    console.error("[partiu-dpm] Falha ao listar notificações.", lista.error);
    return { itens: [], naoLidas: 0 };
  }

  return {
    itens: lista.data.map((registro) => ({
      id: registro.id,
      tipo: registro.tipo,
      titulo: registro.titulo,
      mensagem: registro.mensagem,
      href: registro.href,
      lidaEm: registro.lida_em,
      criadaEm: registro.created_at,
    })),
    naoLidas: contagem.count ?? 0,
  };
}
