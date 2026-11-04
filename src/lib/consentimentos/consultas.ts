import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StatusConsentimento =
  | "pendente"
  | "aceito"
  | "recusado"
  | "revogado";

export type ConsentimentoMenor = {
  status: StatusConsentimento;
  emailResponsavel: string | null;
  expiraEm: string | null;
  expirado: boolean;
};

/** Último consentimento de responsável do usuário logado (se houver). */
export const obterConsentimentoMenor = cache(
  async (): Promise<ConsentimentoMenor | null> => {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) return null;

    const { data, error } = await supabase
      .from("consentimentos")
      .select("status, email_responsavel, expira_em")
      .eq("usuario_id", userData.user.id)
      .eq("tipo", "menor_responsavel")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const status = (
      ["pendente", "aceito", "recusado", "revogado"].includes(
        String(data.status),
      )
        ? data.status
        : "pendente"
    ) as StatusConsentimento;

    const expiraEm = (data.expira_em as string | null) ?? null;
    const expirado =
      status === "pendente" &&
      expiraEm !== null &&
      new Date(expiraEm).getTime() < new Date().getTime();

    return {
      status,
      emailResponsavel: (data.email_responsavel as string | null) ?? null,
      expiraEm,
      expirado,
    };
  },
);
