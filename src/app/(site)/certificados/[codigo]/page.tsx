import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { BotaoImprimir } from "@/components/certificados/botao-imprimir";
import { Container } from "@/components/ui/container";
import {
  IconeCalendario,
  IconeCheck,
  IconeEscudo,
  IconeLocal,
} from "@/components/ui/icons";
import { validarCertificado } from "@/lib/certificados/consultas";
import { siteUrl } from "@/lib/env";
import {
  formatarDataExtensa,
  formatarPeriodo,
} from "@/lib/format";

const ROTULOS_MODALIDADE: Record<string, string> = {
  presencial: "Presencial",
  online: "Online",
  hibrido: "Híbrido",
  hibrida: "Híbrido",
};

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
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-10 sm:py-14 print:bg-white print:py-0">
        <Container>
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-suave print:hidden">
            <div className="h-1.5 bg-gradient-to-r from-brick via-brick to-steel print:hidden" />

            <div className="p-6 sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <Logo />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-steel-300 bg-steel-50 px-3 py-1.5 text-[0.7rem] font-semibold text-deep">
                  <IconeEscudo className="h-3.5 w-3.5 text-steel-700" />
                  Autenticidade confirmada
                </span>
              </div>

              <p className="mt-8 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brick">
                Certificado de participação
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-deep sm:text-3xl">
                {certificado.participante}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                participou do evento{" "}
                <strong className="font-semibold text-deep">
                  {certificado.evento}
                </strong>
                , promovido pela ETEC Darcy Pereira de Moraes.
              </p>

              <dl className="mt-8 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Data do evento
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-deep">
                    {certificado.eventoInicio
                      ? formatarDataExtensa(certificado.eventoInicio)
                      : "Data não informada"}
                  </dd>
                  {certificado.eventoInicio && certificado.eventoFim ? (
                    <dd className="mt-0.5 text-xs text-muted">
                      {formatarPeriodo(
                        certificado.eventoInicio,
                        certificado.eventoFim,
                      )}
                    </dd>
                  ) : null}
                </div>

                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Modalidade
                  </dt>
                  <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-deep">
                    <IconeLocal className="h-4 w-4 text-steel-700" />
                    {ROTULOS_MODALIDADE[certificado.modalidade ?? ""] ??
                      "Não informada"}
                    {certificado.local ? ` · ${certificado.local}` : ""}
                  </dd>
                </div>

                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Emitido em
                  </dt>
                  <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-deep">
                    <IconeCalendario className="h-4 w-4 text-steel-700" />
                    {certificado.dataEmissao
                      ? formatarDataExtensa(certificado.dataEmissao)
                      : "Data não informada"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Código de validação
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-deep">
                    {certificado.codigo}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 print:hidden">
                <p className="max-w-md text-xs leading-relaxed text-muted">
                  Este documento é validado em tempo real pelo banco de dados do
                  Partiu DPM. Guarde o código para conferências futuras.
                </p>
                <BotaoImprimir />
              </div>

              <p className="mt-4 hidden text-[0.65rem] text-muted print:block">
                Valide este certificado em {siteUrl}/certificados/
                {certificado.codigo}
              </p>
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

          <div className="hidden print:block">
            <Image
              src={`/api/certificados/${certificado.codigo}/imagem`}
              alt={`Certificado de ${certificado.participante}`}
              width={2000}
              height={1414}
              unoptimized
              className="h-auto w-full"
            />
          </div>
        </Container>
      </main>
    </>
  );
}
