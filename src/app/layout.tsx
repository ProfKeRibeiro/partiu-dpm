import type { Metadata, Viewport } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const descricaoPadrao =
  "Palestras, oficinas, treinamentos e outros encontros da comunidade escolar DPM. Descubra a agenda, inscreva-se e acompanhe sua participação.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Partiu DPM — Seu próximo evento começa aqui.",
    template: "%s | Partiu DPM",
  },
  description: descricaoPadrao,
  applicationName: "Partiu DPM",
  keywords: [
    "Partiu DPM",
    "eventos",
    "educação",
    "tecnologia",
    "palestras",
    "oficinas",
    "treinamentos",
    "comunidade escolar",
  ],
  authors: [{ name: "Partiu DPM" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Partiu DPM",
    title: "Partiu DPM — Seu próximo evento começa aqui.",
    description: descricaoPadrao,
  },
  twitter: {
    card: "summary_large_image",
    title: "Partiu DPM — Seu próximo evento começa aqui.",
    description: descricaoPadrao,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#003049",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-deep focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-papaya"
        >
          Ir para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
