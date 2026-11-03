import "server-only";

import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enviarAvisoEvento } from "@/lib/email/avisos";
import { emailConfigurado } from "@/lib/email/enviar";

/**
 * Envia o e-mail de inscrição confirmada para quem acabou de ser promovido da
 * lista de espera.
 *
 * A promoção acontece dentro da RPC de cancelamento, então o participante não é
 * o usuário da requisição: os dados são lidos com a chave `service_role`, no
 * servidor. O controle de repetição usa `registrar_aviso_email` com a mesma
 * chave, que tem permissão de executar a função.
 */
export async function agendarAvisoPromovido(inscricaoId: string) {
  if (!emailConfigurado()) return;

  const admin = createSupabaseAdminClient();

  if (!admin) {
    console.warn(
      "[partiu-dpm] SUPABASE_SERVICE_ROLE_KEY ausente: aviso do promovido não enviado.",
    );
    return;
  }

  const { data: podeEnviar } = await admin.rpc("registrar_aviso_email", {
    p_inscricao_id: inscricaoId,
    p_tipo: "inscrito",
    p_janela_segundos: 300,
  });

  if (podeEnviar !== true) return;

  const { data: inscricao } = await admin
    .from("inscricoes")
    .select("participante_id, evento_id")
    .eq("id", inscricaoId)
    .maybeSingle();

  if (!inscricao) return;

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
    console.warn("[partiu-dpm] Promovido sem e-mail para avisar.");
    return;
  }

  const dados = {
    nome: (participante?.nome_completo as string | null) ?? "",
    email,
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

  after(async () => {
    await enviarAvisoEvento({ tipo: "inscrito", dados });
  });
}
