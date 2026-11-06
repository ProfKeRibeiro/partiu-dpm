import "server-only";

import { enviarEmail } from "@/lib/email/enviar";
import { enviarConsentimentoWhatsApp } from "@/lib/whatsapp/enviar";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

function escapar(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function enviarEmailConsentimentoMenor(params: {
  para: string;
  nomeTitular: string;
  eventoTitulo: string | null;
  token: string;
  telefoneResponsavel?: string | null;
  consentimentoId?: string | null;
}) {
  const linkAceitar = `${siteUrl}/consentimento/${params.token}?decisao=aceitar`;
  const linkRecusar = `${siteUrl}/consentimento/${params.token}?decisao=recusar`;
  const evento = params.eventoTitulo
    ? ` para o evento ${params.eventoTitulo}`
    : "";

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5F5F5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:24px;">
      <div style="background:#780000;border-radius:12px 12px 0 0;padding:20px 24px;color:#FDF0D5;">
        <p style="margin:0;font-size:13px;letter-spacing:.14em;text-transform:uppercase;">Partiu DPM</p>
        <h1 style="margin:8px 0 0;font-size:22px;">Autorização do responsável</h1>
      </div>
      <div style="background:#FFFFFF;border:1px solid #E6E6E6;border-top:0;border-radius:0 0 12px 12px;padding:24px;">
        <p style="margin:0 0 14px;color:#003049;font-size:15px;line-height:1.6;">
          Olá! Recebemos o cadastro de <strong>${escapar(params.nomeTitular)}</strong>${escapar(evento)}.
          Como a pessoa é menor de idade, precisamos da sua autorização para tratar os dados e concluir a inscrição.
        </p>
        <p style="margin:0 0 22px;color:#003049;font-size:15px;line-height:1.6;">
          Ao <strong>aceitar</strong>, você autoriza o tratamento dos dados pessoais do titular para esta inscrição — com isso habilita a participação do titular no evento, no sorteio e nos canais de comunicação que enviam publicações sobre a divulgação do vestibulinho e vagas remanescentes na ETEC DPM — e a inscrição segue para a confirmação. Ao <strong>recusar</strong>, você não autoriza o tratamento e a inscrição não será efetivada.
        </p>
        <p style="margin:0 0 22px;color:#003049;font-size:15px;line-height:1.6;">
          O link escolhido registra seu aceite ou recusa, com data, hora e origem. Ele expira em 7 dias.
        </p>
        <p style="margin:0 0 18px;">
          <a href="${escapar(linkAceitar)}" style="display:inline-block;background:#C1121F;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:999px;margin-right:10px;">Aceitar autorização</a>
          <a href="${escapar(linkRecusar)}" style="display:inline-block;background:#FFFFFF;color:#C1121F;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border:2px solid #C1121F;border-radius:999px;">Recusar autorização</a>
        </p>
        <p style="margin:0;color:#506676;font-size:12px;line-height:1.6;">
          Se você não reconhece este cadastro, ignore esta mensagem ou utilize o link de recusa.
        </p>
        <p style="margin:20px 0 0;color:#506676;font-size:12px;">Equipe Partiu DPM / Etec DPM</p>
        <p style="margin:4px 0 0;color:#506676;font-size:12px;">Contato: <a href="mailto:e261dir@cps.sp.gov.br" style="color:#506676;">e261dir@cps.sp.gov.br</a></p>
      </div>
    </div>
  </body></html>`;

  const resultado = await enviarEmail({
    para: params.para,
    nome: null,
    assunto: `Autorização de responsável — ${params.nomeTitular}`,
    texto: `Cadastro de ${params.nomeTitular}${evento}. Como a pessoa é menor de idade, precisamos da sua autorização para tratar os dados pessoais do titular e concluir a inscrição. Ao aceitar, você autoriza o tratamento dos dados pessoais do titular e, com isso, habilita a participação do titular no evento, no sorteio e nos canais de comunicação que enviam publicações sobre a divulgação do vestibulinho e vagas remanescentes na ETEC DPM; a inscrição segue para a confirmação. Ao recusar, você não autoriza o tratamento e a inscrição não será efetivada. Aceite a autorização: ${linkAceitar} | Recuse a autorização: ${linkRecusar}`,
    html,
  });

  if (!resultado.ok) {
    console.warn(
      "[partiu-dpm] E-mail de consentimento não enviado.",
      resultado.motivo,
      resultado.motivo === "falha" ? resultado.erro : "",
    );
  }

  // Canal WhatsApp: envia o link de aceite (?decisao=aceitar) quando houver
  // telefone do responsável; o e-mail continua como registro/fallback.
  if (params.consentimentoId && params.telefoneResponsavel) {
    // O cliente admin é necessário porque o fluxo da escola é anônimo (sem
    // sessão) e a marcação do envio não pode depender de RLS do usuário.
    const supabase =
      createSupabaseAdminClient() ?? (await createSupabaseServerClient());
    const { data: consent } = await supabase
      .from("consentimentos")
      .select("whatsapp_enviado_em")
      .eq("id", params.consentimentoId)
      .maybeSingle();

    if (consent?.whatsapp_enviado_em == null) {
      const envio = await enviarConsentimentoWhatsApp({
        para: params.telefoneResponsavel,
        nomeTitular: params.nomeTitular,
        token: params.token,
      });

      if (envio.ok) {
        const { error } = await supabase
          .from("consentimentos")
          .update({ whatsapp_enviado_em: new Date().toISOString() })
          .eq("id", params.consentimentoId);

        if (error) {
          console.error("[partiu-dpm] Falha ao marcar envio WhatsApp.", error);
        }
      }
    }
  }
}

/** Convite de re-aceite dos termos para usuários sem aceite da versão vigente. */
export async function enviarEmailReaceiteTermos(params: {
  para: string;
  nome: string;
  versao: string;
}) {
  const link = `${siteUrl}/termos`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5F5F5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:24px;">
      <div style="background:#780000;border-radius:12px 12px 0 0;padding:20px 24px;color:#FDF0D5;">
        <p style="margin:0;font-size:13px;letter-spacing:.14em;text-transform:uppercase;">Partiu DPM</p>
        <h1 style="margin:8px 0 0;font-size:22px;">Aceite os termos atualizados</h1>
      </div>
      <div style="background:#FFFFFF;border:1px solid #E6E6E6;border-top:0;border-radius:0 0 12px 12px;padding:24px;">
        <p style="margin:0 0 14px;color:#003049;font-size:15px;line-height:1.6;">
          Olá, ${escapar(params.nome)}! Atualizamos os Termos de Uso e a Política de Privacidade (versão ${escapar(params.versao)}).
        </p>
        <p style="margin:0 0 20px;color:#003049;font-size:15px;line-height:1.6;">
          Para continuar usando o portal, leia e registre seu aceite. Leva menos de um minuto.
        </p>
        <p style="margin:0 0 18px;">
          <a href="${escapar(link)}" style="display:inline-block;background:#C1121F;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:999px;">Ler e aceitar os termos</a>
        </p>
        <p style="margin:0;color:#506676;font-size:12px;line-height:1.6;">
          Se você já aceitou esta versão, ignore esta mensagem. Dúvidas: <a href="mailto:e261dir@cps.sp.gov.br" style="color:#506676;">e261dir@cps.sp.gov.br</a>.
        </p>
        <p style="margin:20px 0 0;color:#506676;font-size:12px;">Equipe Partiu DPM / Etec DPM</p>
      </div>
    </div>
  </body></html>`;

  const resultado = await enviarEmail({
    para: params.para,
    nome: params.nome,
    assunto: `Aceite os termos atualizados (versão ${params.versao})`,
    texto: `Olá, ${params.nome}! Atualizamos os termos (versão ${params.versao}). Leia e aceite em ${link}. Dúvidas: e261dir@cps.sp.gov.br`,
    html,
  });

  if (!resultado.ok) {
    console.warn(
      "[partiu-dpm] E-mail de re-aceite não enviado.",
      resultado.motivo,
      resultado.motivo === "falha" ? resultado.erro : "",
    );
  }
}
