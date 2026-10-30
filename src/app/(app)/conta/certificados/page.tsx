import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { CabecalhoApp } from "@/components/app/cabecalho";
import { AppContainer } from "@/components/app/container";
import {
  AvisoApp,
  ConteudoCarregando,
  EstadoVazio,
} from "@/components/app/estados";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button-link";
import {
  IconeCertificado,
  IconeEscudo,
  IconeSetaDiagonal,
} from "@/components/ui/icons";
import { obterPerfil, obterUsuario } from "@/lib/auth/sessao";
import { formatarDataExtensa } from "@/lib/format";
import { listarMinhasInscricoes } from "@/lib/inscricoes/consultas";

export const metadata: Metadata = {
  title: "Meus certificados",
  description:
    "Certificados de participação emitidos para você nos eventos do Partiu DPM.",
};

export const instant = false;

export default function CertificadosPage() {
  return (
    <>
      <CabecalhoApp
        eyebrow="Conquistas"
        titulo="Meus certificados"
        descricao="Documentos emitidos após a confirmação de presença. Abra o certificado para visualizar, imprimir ou salvar em PDF."
      />

      <AppContainer className="py-7 sm:py-9">
        <Suspense fallback={<ConteudoCarregando />}>
          <ListaCertificados />
        </Suspense>
      </AppContainer>
    </>
  );
}

async function ListaCertificados() {
  await connection();

  const usuario = await obterUsuario();
  if (!usuario) {
    return (
      <AcessoRestrito variante="sessao" destinoLogin="/conta/certificados" />
    );
  }

  const [perfil, inscricoes] = await Promise.all([
    obterPerfil(),
    listarMinhasInscricoes(),
  ]);

  const certificados = inscricoes
    .filter(
      (inscricao) =>
        inscricao.certificado?.status === "emitido" &&
        inscricao.certificado.codigo &&
        inscricao.evento,
    )
    .sort((a, b) => {
      const aData = a.certificado?.dataEmissao
        ? new Date(a.certificado.dataEmissao).getTime()
        : 0;
      const bData = b.certificado?.dataEmissao
        ? new Date(b.certificado.dataEmissao).getTime()
        : 0;

      return bData - aData;
    });

  const nome = perfil?.nome_completo ?? usuario.nome ?? "Participante";

  if (certificados.length === 0) {
    return (
      <div className="space-y-6">
        <EstadoVazio
          icone={<IconeCertificado className="h-5 w-5" />}
          titulo="Nenhum certificado emitido ainda"
          descricao="O certificado aparece aqui depois que a organização registra sua presença no evento e emite o documento. Acompanhe suas inscrições para não perder nenhum encontro."
          acao={
            <ButtonLink href="/conta/inscricoes" tamanho="sm">
              Ver minhas inscrições
            </ButtonLink>
          }
        />

        <AvisoApp>
          <strong className="font-semibold text-deep">
            Como funciona:
          </strong>{" "}
          a presença é registrada pela organização no dia do evento. Depois
          disso, o certificado é emitido com um código de validação pública e
          fica disponível nesta página.
        </AvisoApp>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {certificados.length}{" "}
          {certificados.length === 1
            ? "certificado disponível"
            : "certificados disponíveis"}
        </p>
        <p className="text-xs text-muted">
          {nome} · {usuario.email}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {certificados.map((inscricao) => {
          const certificado = inscricao.certificado;
          const evento = inscricao.evento;

          if (!certificado || !evento) return null;

          return (
            <article
              key={inscricao.id}
              className="group overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-suave"
            >
              <div className="relative overflow-hidden border-b border-line bg-gradient-to-br from-papaya via-papaya to-shell p-5 sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
                <div
                  className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 opacity-[0.07]"
                  aria-hidden="true"
                >
                  <LogoMark className="h-44 w-44" />
                </div>

                <div className="relative">
                  <p className="inline-flex items-center gap-2 rounded-full border border-deep/10 bg-white/70 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-brick">
                    <IconeCertificado className="h-3 w-3" />
                    Certificado de participação
                  </p>

                  <h2 className="mt-3 font-display text-xl font-semibold leading-snug text-deep">
                    {evento.titulo}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-ink">{nome}</p>

                  <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-deep/10 bg-white/70 px-2.5 py-1.5 font-mono text-[0.65rem] text-muted">
                    <IconeEscudo className="h-3.5 w-3.5 shrink-0 text-steel-700" />
                    <span className="truncate">{certificado.codigo}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                <span className="text-xs text-muted">
                  {certificado.dataEmissao
                    ? `Emitido em ${formatarDataExtensa(certificado.dataEmissao)}`
                    : "Certificado emitido"}
                </span>
                <ButtonLink
                  href={`/certificados/${certificado.codigo}`}
                  tamanho="sm"
                >
                  Abrir certificado
                  <IconeSetaDiagonal className="h-4 w-4" />
                </ButtonLink>
              </div>
            </article>
          );
        })}
      </div>

      <AvisoApp>
        Precisa do arquivo em PDF? Abra o certificado e use{" "}
        <strong className="font-semibold text-deep">Imprimir / PDF</strong>. O
        código de validação pode ser conferido por qualquer pessoa em{" "}
        <Link
          href="/certificados"
          className="font-semibold text-brick underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
        >
          Validar certificado
        </Link>
        .
      </AvisoApp>
    </div>
  );
}
