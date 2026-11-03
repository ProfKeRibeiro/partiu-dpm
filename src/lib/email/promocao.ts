import "server-only";

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enviarAvisoEvento } from "@/lib/email/avisos";
import { liberarAviso } from "@/lib/email/dedupe";
import { emailConfigurado } from "@/lib/email/enviar";

type ClienteSupabase = SupabaseClient;

/**
 * Envia o e-mail de convocação para quem acabou de ganhar uma vaga.
 *
 * A convocação nasce dentro de uma RPC (cancelamento, recusa ou expiração), e o
 * destinatário não é o usuário da requisição: os dados são lidos com a chave
 * `service_role`, no servidor. O controle de repetição usa
 * `registrar_aviso_email` com a mesma chave.
 */
export async function agendarConvite(
  inscricaoId: string,
  prazo: string | null,
  imediato = false,
) {
  if (!emailConfigurado()) return;

  const admin = createSupabaseAdminClient();

  if (!admin) {
    console.warn(
      "[partiu-dpm] SUPABASE_SERVICE_ROLE_KEY ausente: convite não enviado.",
    );
    return;
  }

  const { data: avisoId, error: erroAviso } = await admin.rpc(
    "registrar_aviso_email",
    {
      p_inscricao_id: inscricaoId,
      p_tipo: "convite",
      p_janela_segundos: 300,
    },
  );

  if (erroAviso) {
    console.warn(
      "[partiu-dpm] Falha ao registrar aviso de convite:",
      erroAviso.message,
    );
    return;
  }

  if (!avisoId) return;

  const { data: inscricao } = await admin
    .from("inscricoes")
    .select("participante_id, evento_id")
    .eq("id", inscricaoId)
    .maybeSingle();

  if (!inscricao) {
    await liberarAviso(avisoId as string);
    return;
  }

  const [{ data: evento }, { data: participante }, usuario] = await Promise.all([
    admin
      .from("eventos")
      .select("id, titulo, tipo, modalidade, local_evento, data_inicio, data_fim")
      .eq("id", inscricao.evento_id)
      .maybeSingle(),
    admin
      .from("participantes")
      .select("nome_completo")
      .eq("id", inscricao.participante_id)
      .maybeSingle(),
    admin.auth.admin.getUserById(inscricao.participante_id as string),
  ]);

  const email = usuario.data.user?.email;

  if (!evento || !email) {
    console.warn("[partiu-dpm] Convocado sem e-mail para avisar.");
    await liberarAviso(avisoId as string);
    return;
  }

  const dados = {
    nome: (participante?.nome_completo as string | null) ?? "",
    email,
    prazo,
    evento: {
      id: evento.id as string,
      titulo: evento.titulo as string,
      tipo: evento.tipo as string,
      modalidade: evento.modalidade as string,
      local: (evento.local_evento as string | null) ?? null,
      inicio: (evento.data_inicio as string | null) ?? null,
      fim: (evento.data_fim as string | null) ?? null,
    },
  };

  if (imediato) {
    const resultado = await enviarAvisoEvento({ tipo: "convite", dados });

    if (!resultado.ok && resultado.motivo === "falha") {
      await liberarAviso(avisoId as string);
    }

    return;
  }

  after(async () => {
    const resultado = await enviarAvisoEvento({ tipo: "convite", dados });

    if (!resultado.ok && resultado.motivo === "falha") {
      await liberarAviso(avisoId as string);
    }
  });
}

/** Expira convites vencidos e avisa quem for convocado na sequência. */
export async function expirarConvitesEAvisar(supabase: ClienteSupabase) {
  const { data, error } = await supabase.rpc("expirar_convites");

  if (error) {
    console.warn("[partiu-dpm] Falha ao expirar convites.", error.message);
    return;
  }

  const novos = (data?.novos ?? []) as Array<{
    inscricao_id?: string;
    expira_em?: string;
  }>;

  for (const convite of novos) {
    if (convite.inscricao_id) {
      await agendarConvite(convite.inscricao_id, convite.expira_em ?? null);
    }
  }
}

/**
 * Versão usada pela rotina diária (cron da Vercel): roda sem sessão, com a
 * chave `service_role`, e envia os e-mails de convocação na hora.
 */
export async function expirarConvitesCron() {
  const admin = createSupabaseAdminClient();

  if (!admin) {
    return { ok: false, motivo: "sem_chave" as const, novos: 0 };
  }

  const { data, error } = await admin.rpc("expirar_convites");

  if (error) {
    console.error("[partiu-dpm] Cron de convites falhou.", error);
    return { ok: false, motivo: "rpc" as const, novos: 0 };
  }

  const novos = (data?.novos ?? []) as Array<{
    inscricao_id?: string;
    expira_em?: string;
  }>;

  let enviados = 0;

  for (const convite of novos) {
    if (!convite.inscricao_id) continue;

    await agendarConvite(
      convite.inscricao_id,
      convite.expira_em ?? null,
      true,
    );

    enviados += 1;
  }

  return { ok: true, novos: novos.length, enviados };
}
