import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CertificadoValidado = {
  codigo: string;
  status: string;
  dataEmissao: string | null;
  participante: string;
  evento: string;
  eventoInicio: string | null;
  eventoFim: string | null;
  modalidade: string | null;
  local: string | null;
};

export async function validarCertificado(
  codigo: string,
): Promise<CertificadoValidado | null> {
  if (!isSupabaseConfigured || !REGEX_UUID.test(codigo)) return null;

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("validar_certificado", {
    p_codigo: codigo,
  });

  if (error || !data || typeof data !== "object") return null;

  const item = data as Record<string, unknown>;

  if (typeof item.codigo_validacao !== "string") return null;

  return {
    codigo: item.codigo_validacao,
    status: String(item.status ?? "emitido"),
    dataEmissao:
      typeof item.data_emissao === "string" ? item.data_emissao : null,
    participante: String(item.participante ?? "Participante"),
    evento: String(item.evento ?? "Evento"),
    eventoInicio:
      typeof item.evento_inicio === "string" ? item.evento_inicio : null,
    eventoFim: typeof item.evento_fim === "string" ? item.evento_fim : null,
    modalidade:
      typeof item.modalidade === "string" ? item.modalidade : null,
    local: typeof item.local_evento === "string" ? item.local_evento : null,
  };
}
