"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioEhAdmin } from "@/lib/auth/sessao";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_VALIDOS = ["confirmada", "cancelada", "lista_espera"] as const;

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

async function garantirAdmin() {
  const admin = await usuarioEhAdmin();
  if (!admin) redirect("/entrar?next=/admin");
}

function revalidar(eventoId: string) {
  revalidatePath("/admin");
  revalidatePath("/conta");
  revalidatePath("/eventos");
  revalidatePath("/");

  if (REGEX_UUID.test(eventoId)) {
    revalidatePath(`/admin/eventos/${eventoId}`);
    revalidatePath(`/eventos/${eventoId}`);
  }
}

export async function definirPresenca(formData: FormData) {
  await garantirAdmin();

  const inscricaoId = texto(formData, "inscricao_id");
  const eventoId = texto(formData, "evento_id");
  const presente = texto(formData, "presente") === "true";

  if (!REGEX_UUID.test(inscricaoId) || !REGEX_UUID.test(eventoId)) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_definir_presenca", {
    p_inscricao_id: inscricaoId,
    p_presente: presente,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao registrar presença.", error);
  }

  revalidar(eventoId);
}

export async function emitirCertificado(formData: FormData) {
  await garantirAdmin();

  const inscricaoId = texto(formData, "inscricao_id");
  const eventoId = texto(formData, "evento_id");

  if (!REGEX_UUID.test(inscricaoId) || !REGEX_UUID.test(eventoId)) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_emitir_certificado", {
    p_inscricao_id: inscricaoId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao emitir certificado.", error);
  }

  revalidar(eventoId);
}

export async function cancelarCertificado(formData: FormData) {
  await garantirAdmin();

  const inscricaoId = texto(formData, "inscricao_id");
  const eventoId = texto(formData, "evento_id");

  if (!REGEX_UUID.test(inscricaoId) || !REGEX_UUID.test(eventoId)) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_cancelar_certificado", {
    p_inscricao_id: inscricaoId,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao cancelar certificado.", error);
  }

  revalidar(eventoId);
}

export async function definirStatusInscricao(formData: FormData) {
  await garantirAdmin();

  const inscricaoId = texto(formData, "inscricao_id");
  const eventoId = texto(formData, "evento_id");
  const status = texto(formData, "status");

  if (!REGEX_UUID.test(inscricaoId) || !REGEX_UUID.test(eventoId)) return;
  if (!STATUS_VALIDOS.includes(status as (typeof STATUS_VALIDOS)[number])) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_definir_status_inscricao", {
    p_inscricao_id: inscricaoId,
    p_status: status,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao alterar status da inscrição.", error);
  }

  revalidar(eventoId);
}
