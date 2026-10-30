import type { Metadata } from "next";
import Link from "next/link";
import { ConsultaCertificado } from "@/components/certificados/consulta-certificado";
import { LeitorQrCode } from "@/components/certificados/leitor-qr";
import { Container } from "@/components/ui/container";
import { IconeCertificado, IconeEscudo } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Validar certificado",
  description:
    "Confira a autenticidade de um certificado emitido pelo Partiu DPM usando o código de validação.",
};

export default function CertificadosPage() {
  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-papaya">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full border border-steel/25" />
        <div className="pointer-events-none absolute -right-6 top-0 h-40 w-40 rounded-full border border-brick/15" />

        <Container className="relative py-12 sm:py-16">
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
            <span className="text-deep">Certificados</span>
          </nav>

          <p className="mt-6 flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brick">
            <span className="h-px w-7 bg-brick" aria-hidden="true" />
            Validação pública
          </p>

          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-deep sm:text-4xl">
            Validar certificado
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink sm:text-base">
            Confira se um documento foi emitido pelo Partiu DPM e veja os dados
            do evento e do participante.
          </p>
        </Container>
      </header>

      <main className="flex-1 bg-canvas py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-suave">
            <div className="h-1.5 bg-gradient-to-r from-brick via-brick to-steel" />
            <div className="p-6 sm:p-8">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-papaya text-steel-700 ring-1 ring-deep/10">
                <IconeCertificado className="h-6 w-6" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-deep">
                Informe o código
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                A validação consulta o banco em tempo real. Certificados
                cancelados deixam de ser encontrados.
              </p>

              <ConsultaCertificado />

              <div
                className="my-5 flex items-center gap-3 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted"
                aria-hidden="true"
              >
                <span className="h-px flex-1 bg-line" />
                ou aponte a câmera
                <span className="h-px flex-1 bg-line" />
              </div>

              <LeitorQrCode />

              <p className="mt-6 flex items-start gap-2 rounded-xl border border-line bg-canvas px-4 py-3 text-xs leading-relaxed text-muted">
                <IconeEscudo className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
                A validação aceita o código digitado ou o QR code impresso no
                canto inferior esquerdo do certificado. A consulta é pública e
                mostra apenas nome, evento e data de emissão. Nenhum dado de
                contato é exibido.
              </p>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
}
