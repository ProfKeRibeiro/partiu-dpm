import type { NextConfig } from "next";

type PadraoRemoto = {
  protocol: "http" | "https";
  hostname: string;
  pathname?: string;
};

const padroesRemotos: PadraoRemoto[] = [
  {
    protocol: "https",
    hostname: "**.supabase.co",
    pathname: "/storage/v1/object/**",
  },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (supabaseUrl) {
  try {
    const { hostname, protocol } = new URL(supabaseUrl);
    const hostnameNormalizado = hostname.toLowerCase();

    padroesRemotos.push({
      protocol: protocol === "http:" ? "http" : "https",
      hostname: hostnameNormalizado,
      pathname: "/storage/v1/object/**",
    });
  } catch {
    // URL inválida: o app trata a ausência de configuração em tempo de execução.
  }
}

/**
 * CSP bloqueante.
 *
 * `'unsafe-inline'` é necessário para os scripts de bootstrap do Next e para
 * os estilos do Tailwind; a evolução é usar nonce e remover essa exceção.
 *
 * `https:` está liberado em `img-src` porque a imagem do evento é cadastrada
 * pelo painel com URL livre (o "MongoDB Day" usa uma miniatura externa). Imagem
 * não executa script, então o risco fica contido; o ideal é migrar as imagens
 * para o Storage do Supabase e reduzir a lista.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    remotePatterns: padroesRemotos,
    qualities: [75, 100],
  },
  // O modelo (WebP) e as fontes do certificado são lidos com fs em tempo de execução.
  outputFileTracingIncludes: {
    "/api/certificados/**": [
      "./assets/certificado_partiu-dpm.webp",
      "./assets/fontes/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            // camera=(self): o leitor de QR code do certificado usa a câmera
            // do próprio dispositivo na página de validação.
            value: "camera=(self), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
