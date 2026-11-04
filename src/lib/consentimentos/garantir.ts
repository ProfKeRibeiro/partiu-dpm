import "server-only";

import {
  criarConsentimentoMenor,
  registrarAceiteTermos,
  verificarAceiteTermos,
} from "@/lib/consentimentos/acoes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Fecha o aceite dos termos deixado pendente no cadastro.
 *
 * Quando a confirmação de e-mail está ativa, o `signUp` não devolve sessão e
 * não é possível gravar o aceite naquele momento. O cadastro marca
 * `aceite_termos_pendente` nos metadados; no primeiro acesso com sessão
 * (login ou link de confirmação) esta função grava o aceite e, para menor de
 * idade, cria o consentimento do responsável.
 */
export async function garantirConsentimentosIniciais() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const usuario = data.user;

  if (!usuario) return;

  const meta = (usuario.user_metadata ?? {}) as Record<string, unknown>;

  if (meta.aceite_termos_pendente !== true) return;

  if (!(await verificarAceiteTermos())) {
    await registrarAceiteTermos();
  }

  const emailResponsavel = meta.email_responsavel;

  if (
    meta.menor_idade === true &&
    typeof emailResponsavel === "string" &&
    emailResponsavel.trim()
  ) {
    const formulario = new FormData();
    formulario.append("email_responsavel", emailResponsavel.trim());
    await criarConsentimentoMenor(null, formulario);
  }

  await supabase.auth.updateUser({
    data: { aceite_termos_pendente: false },
  });
}
