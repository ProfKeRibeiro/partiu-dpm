import "server-only";

import { after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enviarAvisoEvento, type AvisoTipo } from "@/lib/email/avisos";
import { liberarAviso } from "@/lib/email/dedupe";
import { emailConfigurado } from "@/lib/email/enviar";

type ClienteSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type DadosDoBanco = {
  nome?: string | null;
  email?: string | null;
  codigo_validacao?: string | null;
  evento?: {
    id?: string;
    titulo?: string;
    tipo?: string;
    modalidade?: string;
    local?: string | null;
    inicio?: string | null;
    fim?: string | null;
  } | null;
};

/**
 * Agenda o e-mail de um aviso a partir dos dados da inscrição.
 *
 * Usa a RPC `dados_aviso_inscricao`, que devolve nome, e-mail e evento para o
 * próprio participante ou para administradores. O envio acontece depois da
 * resposta, via `after()`, para não atrasar a ação no painel.
 */
export async function agendarAvisoInscricao(
  supabase: ClienteSupabase,
  inscricaoId: string,
  tipo: AvisoTipo,
  janelaSegundos = 300,
) {
  if (!emailConfigurado()) return;

  /* Deduplica: evita segundo e-mail por duplo clique, atualização da página ou
   * repetição de uma operação já concluída. O reenvio manual usa janela 0.
   * A RPC devolve o id do aviso criado (ou null quando duplicado/sem acesso);
   * esse id é o que permite liberar só o próprio registro. */
  const { data: avisoId, error: erroAviso } = await supabase.rpc(
    "registrar_aviso_email",
    {
      p_inscricao_id: inscricaoId,
      p_tipo: tipo,
      p_janela_segundos: janelaSegundos,
    },
  );

  if (erroAviso) {
    console.warn(
      "[partiu-dpm] Falha ao registrar aviso de e-mail:",
      erroAviso.message,
    );
    return;
  }

  if (!avisoId) return;

  const { data, error } = await supabase.rpc("dados_aviso_inscricao", {
    p_inscricao_id: inscricaoId,
  });

  if (error || !data) {
    console.warn(
      "[partiu-dpm] Sem dados para o e-mail de aviso:",
      error?.message ?? "vazio",
    );
    await liberarAviso(avisoId as string);
    return;
  }

  const bruto = data as DadosDoBanco;
  const evento = bruto.evento;

  if (!bruto.email || !evento?.id) {
    await liberarAviso(avisoId as string);
    return;
  }

  const dados = {
    nome: bruto.nome ?? "",
    email: bruto.email,
    codigoValidacao: bruto.codigo_validacao ?? null,
    evento: {
      id: evento.id,
      titulo: evento.titulo ?? "Evento",
      tipo: evento.tipo ?? "evento",
      modalidade: evento.modalidade ?? "presencial",
      local: evento.local ?? null,
      inicio: evento.inicio ?? null,
      fim: evento.fim ?? null,
    },
  };

  after(async () => {
    const resultado = await enviarAvisoEvento({ tipo, dados });

    if (!resultado.ok && resultado.motivo === "falha") {
      await liberarAviso(avisoId as string);
    }
  });
}
