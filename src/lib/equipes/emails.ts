import "server-only";

import { enviarEmail } from "@/lib/email/enviar";
import { siteUrl } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EquipeEmail = {
  id: string;
  nome: string;
  codigo: string;
  lider_id: string;
  orientador_nome: string | null;
  orientador_email: string | null;
  evento: {
    id: string;
    titulo: string;
    data_inicio: string;
    local_evento: string | null;
    modalidade: string;
  };
};

type MembroEmail = {
  participanteId: string;
  nome: string;
  email: string | null;
  papel: string;
};

function escapar(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dataDoEvento(iso: string) {
  const data = new Date(iso);

  if (Number.isNaN(data.getTime())) return "a definir";

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function linkDaEquipe(codigo: string) {
  return `${siteUrl}/equipes/${codigo}`;
}

function montarHtml(params: {
  titulo: string;
  abertura: string;
  linhas: Array<[string, string]>;
  botao: string;
  url: string;
  rodape?: string;
}) {
  const linhas = params.linhas
    .map(
      ([rotulo, valor]) =>
        `<tr><td style="padding:6px 0;color:#506676;font-size:13px;">${escapar(rotulo)}</td><td style="padding:6px 0;color:#003049;font-size:13px;font-weight:600;">${escapar(valor)}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5F5F5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:24px;">
      <div style="background:#780000;border-radius:12px 12px 0 0;padding:20px 24px;color:#FDF0D5;">
        <p style="margin:0;font-size:13px;letter-spacing:.14em;text-transform:uppercase;">Partiu DPM</p>
        <h1 style="margin:8px 0 0;font-size:22px;">${escapar(params.titulo)}</h1>
      </div>
      <div style="background:#FFFFFF;border:1px solid #E6E6E6;border-top:0;border-radius:0 0 12px 12px;padding:24px;">
        <p style="margin:0 0 16px;color:#003049;font-size:15px;line-height:1.6;">${escapar(params.abertura)}</p>
        <table style="width:100%;border-collapse:collapse;">${linhas}</table>
        <p style="margin:24px 0 8px;">
          <a href="${escapar(params.url)}" style="display:inline-block;background:#C1121F;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:999px;">${escapar(params.botao)}</a>
        </p>
        <p style="margin:12px 0 0;color:#506676;font-size:12px;line-height:1.6;">
          ${escapar(params.rodape ?? "Se você não reconhece esta equipe, ignore esta mensagem.")}
        </p>
        <p style="margin:20px 0 0;color:#506676;font-size:12px;">Equipe Partiu DPM / Etec DPM</p>
        <p style="margin:4px 0 0;color:#506676;font-size:12px;">Contato: <a href="mailto:e261dir@cps.sp.gov.br" style="color:#506676;">e261dir@cps.sp.gov.br</a></p>
      </div>
    </div>
  </body></html>`;
}

async function carregarEquipe(
  equipeId: string,
): Promise<{ equipe: EquipeEmail; membros: MembroEmail[] } | null> {
  const admin = createSupabaseAdminClient();

  if (!admin) {
    console.warn(
      "[partiu-dpm] SUPABASE_SERVICE_ROLE_KEY ausente: e-mails de equipe não enviados.",
    );
    return null;
  }

  const { data: equipe } = await admin
    .from("equipes")
    .select(
      "id, nome, codigo, lider_id, orientador_nome, orientador_email, eventos (id, titulo, data_inicio, local_evento, modalidade)",
    )
    .eq("id", equipeId)
    .maybeSingle();

  if (!equipe) return null;

  const evento = Array.isArray(equipe.eventos)
    ? equipe.eventos[0]
    : equipe.eventos;

  if (!evento) return null;

  const { data: linhas } = await admin
    .from("equipe_membros")
    .select("participante_id, papel, participantes (nome_completo)")
    .eq("equipe_id", equipeId)
    .order("created_at");

  const membros: MembroEmail[] = [];

  for (const linha of linhas ?? []) {
    const participante = Array.isArray(linha.participantes)
      ? linha.participantes[0]
      : linha.participantes;
    const { data: usuario } = await admin.auth.admin.getUserById(
      linha.participante_id as string,
    );

    membros.push({
      participanteId: linha.participante_id as string,
      nome:
        (participante?.nome_completo as string | undefined) ?? "Participante",
      email: usuario.user?.email ?? null,
      papel: (linha.papel as string) ?? "membro",
    });
  }

  return {
    equipe: {
      id: equipe.id as string,
      nome: equipe.nome as string,
      codigo: equipe.codigo as string,
      lider_id: equipe.lider_id as string,
      orientador_nome: (equipe.orientador_nome as string | null) ?? null,
      orientador_email: (equipe.orientador_email as string | null) ?? null,
      evento: {
        id: evento.id as string,
        titulo: evento.titulo as string,
        data_inicio: evento.data_inicio as string,
        local_evento: (evento.local_evento as string | null) ?? null,
        modalidade: evento.modalidade as string,
      },
    },
    membros,
  };
}

function linhasDaEquipe(equipe: EquipeEmail, membros: MembroEmail[]) {
  return [
    ["Equipe", equipe.nome],
    ["Evento", equipe.evento.titulo],
    ["Data", dataDoEvento(equipe.evento.data_inicio)],
    ["Local", equipe.evento.local_evento ?? equipe.evento.modalidade],
    ["Código de convite", equipe.codigo],
    ["Membros", membros.map((m) => m.nome).join(", ")],
  ] as Array<[string, string]>;
}

async function enviarPara(
  para: string,
  assunto: string,
  titulo: string,
  abertura: string,
  equipe: EquipeEmail,
  membros: MembroEmail[],
  rodape?: string,
) {
  if (!para) return;

  const resultado = await enviarEmail({
    para,
    nome: null,
    assunto,
    texto: `${abertura}\n\n${linhasDaEquipe(equipe, membros)
      .map(([rotulo, valor]) => `${rotulo}: ${valor}`)
      .join("\n")}\n\n${linkDaEquipe(equipe.codigo)}`,
    html: montarHtml({
      titulo,
      abertura,
      linhas: linhasDaEquipe(equipe, membros),
      botao: "Abrir equipe",
      url: linkDaEquipe(equipe.codigo),
      rodape,
    }),
  });

  if (!resultado.ok) {
    console.warn(
      "[partiu-dpm] E-mail de equipe não enviado.",
      resultado.motivo,
      resultado.motivo === "falha" ? resultado.erro : "",
    );
  }
}

export async function enviarConviteEquipe(equipeId: string) {
  const dados = await carregarEquipe(equipeId);
  if (!dados) return;

  const lider = dados.membros.find((m) => m.participanteId === dados.equipe.lider_id);

  if (!lider?.email) return;

  await enviarPara(
    lider.email,
    `Equipe "${dados.equipe.nome}" criada — código ${dados.equipe.codigo}`,
    "Sua equipe foi criada",
    `Olá! Sua equipe "${dados.equipe.nome}" foi criada. Compartilhe o código ${dados.equipe.codigo} com os colegas para eles entrarem.`,
    dados.equipe,
    dados.membros,
  );
}

export async function enviarEntradaEquipe(
  equipeId: string,
  participanteId: string,
) {
  const dados = await carregarEquipe(equipeId);
  if (!dados) return;

  const membro = dados.membros.find((m) => m.participanteId === participanteId);

  if (!membro?.email) return;

  await enviarPara(
    membro.email,
    `Você entrou na equipe "${dados.equipe.nome}"`,
    "Você entrou na equipe",
    `Olá, ${membro.nome}! Você entrou na equipe "${dados.equipe.nome}" para o evento ${dados.equipe.evento.titulo}.`,
    dados.equipe,
    dados.membros,
  );
}

export async function enviarEquipeConfirmada(equipeId: string) {
  const dados = await carregarEquipe(equipeId);
  if (!dados) return;

  const { equipe, membros } = dados;
  const assunto = `Equipe confirmada: ${equipe.nome}`;
  const abertura = `A equipe "${equipe.nome}" atingiu o mínimo de membros e está confirmada no evento ${equipe.evento.titulo}.`;

  for (const membro of membros) {
    if (!membro.email) continue;

    await enviarPara(
      membro.email,
      assunto,
      "Equipe confirmada",
      abertura,
      equipe,
      membros,
    );
  }

  if (equipe.orientador_email) {
    await enviarPara(
      equipe.orientador_email,
      `Equipe "${equipe.nome}" confirmada no evento ${equipe.evento.titulo}`,
      "Sua equipe orientada foi confirmada",
      `Olá, ${equipe.orientador_nome ?? "professor(a)"}! A equipe "${equipe.nome}", que você orienta, está confirmada no evento ${equipe.evento.titulo}.`,
      equipe,
      membros,
      "Este aviso foi enviado porque você foi cadastrado como orientador da equipe.",
    );
  }
}
