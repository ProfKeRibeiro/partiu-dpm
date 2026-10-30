import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotaoImprimir } from "@/components/certificados/botao-imprimir";
import { Container } from "@/components/ui/container";
import { IconeCheck, IconeQr } from "@/components/ui/icons";
import { validarCertificado } from "@/lib/certificados/consultas";

export const metadata: Metadata = {
  title: "Certificado",
  description:
    "Validação pública de certificado emitido pelo Partiu DPM.",
  robots: { index: false, follow: false },
};

export default function CertificadoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  return (
    <Suspense fallback={<CertificadoCarregando />}>
      <CertificadoConteudo params={params} />
    </Suspense>
  );
}

function CertificadoCarregando() {
  return (
    <main className="flex-1 bg-canvas py-10 sm:py-14">
      <Container>
        <div className="mx-auto max-w-3xl rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-10">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-deep/10" />
          <div className="mt-6 h-3 w-40 animate-pulse rounded bg-deep/10" />
          <div className="mt-4 h-7 w-2/3 animate-pulse rounded bg-deep/10" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="h-12 animate-pulse rounded bg-deep/10" />
            <div className="h-12 animate-pulse rounded bg-deep/10" />
          </div>
        </div>
      </Container>
    </main>
  );
}

async function CertificadoConteudo({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const certificado = await validarCertificado(codigo);

  if (!certificado) notFound();

  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-papaya print:hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full border border-steel/25" />

        <Container className="relative py-10 sm:py-14">
          <nav
            aria-label="Trilha de navegação"
            className="flex items-center gap-2 text-xs text-muted"
          >
            <Link
              href="/"
              className="transition-colors hover:text-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Início
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/certificados"
              className="transition-colors hover:text-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Certificados
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-deep">Validação</span>
          </nav>

          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-deep/15 bg-white/70 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-deep">
            <IconeCheck className="h-3.5 w-3.5 text-brick" />
            Certificado válido
          </p>

          <h1 className="mt-4 max-w-3xl text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-deep sm:text-4xl">
            {certificado.evento}
          </h1>
          <p className="mt-3 text-sm text-ink">
            Emitido para {certificado.participante}
          </p>
          <p className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-deep/10 bg-white/70 px-2.5 py-1.5 font-mono text-[0.68rem] text-muted">
            <IconeQr className="h-3.5 w-3.5 shrink-0 text-steel-700" />
            <span className="truncate">{certificado.codigo}</span>
          </p>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-10 sm:py-14 print:bg-white print:py-0">
        <Container>
          <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-suave print:max-w-none print:rounded-none print:border-0 print:shadow-none">
            <Image
              src={`/api/certificados/${certificado.codigo}/imagem`}
              alt={`Certificado de ${certificado.participante}`}
              width={2000}
              height={1414}
              unoptimized
              priority
              className="h-auto w-full"
            />
          </div>

          <div className="mx-auto mt-5 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-deep/10 bg-white p-4 shadow-sm print:hidden">
            <p className="max-w-xl text-xs leading-relaxed text-muted">
              O certificado acima é gerado a partir do modelo oficial e é
              validado em tempo real pelo banco de dados do Partiu DPM.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/certificados/${certificado.codigo}/imagem`}
                download={`certificado-${certificado.codigo}.svg`}
                className="inline-flex h-9 items-center justify-center rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep transition-colors hover:bg-papaya/60"
              >
                Baixar certificado
              </a>
              <BotaoImprimir />
            </div>
          </div>

          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2 print:hidden">
            <Link
              href="/certificados"
              className="text-xs font-medium text-muted underline-offset-4 transition-colors hover:text-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Validar outro certificado
            </Link>
            <span className="text-xs text-line" aria-hidden="true">
              •
            </span>
            <Link
              href="/conta"
              className="text-xs font-medium text-muted underline-offset-4 transition-colors hover:text-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
            >
              Minha área
            </Link>
          </div>

        </Container>
      </main>
    </>
  );
}
