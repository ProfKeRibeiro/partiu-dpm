const urlBruta = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const chaveBruta = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

function ehUrlValida(valor: string | undefined): valor is string {
  if (!valor) return false;

  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Configuração pública do Supabase.
 *
 * Apenas a URL e a chave `anon` são expostas ao navegador. A chave
 * `service_role` nunca deve ser usada no frontend nem versionada.
 */
export const supabasePublicConfig =
  ehUrlValida(urlBruta) && chaveBruta
    ? { url: urlBruta, anonKey: chaveBruta }
    : null;

export const isSupabaseConfigured = supabasePublicConfig !== null;

export function getSupabasePublicConfig() {
  if (!supabasePublicConfig) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local.",
    );
  }

  return supabasePublicConfig;
}

function resolverSiteUrl() {
  const valor = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (ehUrlValida(valor)) {
    return valor.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export const siteUrl = resolverSiteUrl();
