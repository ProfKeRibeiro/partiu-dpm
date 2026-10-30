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

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    remotePatterns: padroesRemotos,
    qualities: [75, 100],
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
