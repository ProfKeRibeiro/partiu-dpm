import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AcessoRestrito } from "@/components/auth/acesso-restrito";
import { FormularioPerfil } from "@/components/auth/formulario-perfil";
import { FormularioFotoPerfil } from "@/components/auth/formulario-foto-perfil";
import { FormularioSenha } from "@/components/auth/formulario-senha";
import { CabecalhoApp } from "@/components/app/cabecalho";
import { AppContainer } from "@/components/app/container";
import {
  IconeCadeado,
  IconeEscudo,
  IconeLapis,
  IconePessoa,
  IconeSair,
  IconeSetaDiagonal,
} from "@/components/ui/icons";
import { iniciais, rotuloCategoria } from "@/lib/app-utils";
import { sair } from "@/lib/auth/acoes";
import { obterPerfil, obterUsuario, usuarioEhAdmin } from "@/lib/auth/sessao";

export const metadata: Metadata = {
  title: "Meu perfil",
  description: "Atualize seus dados de participante e a senha de acesso.",
};

export const instant = false;

export default function PerfilPage() {
  return (
    <>
      <CabecalhoApp
        eyebrow="Conta"
        titulo="Meu perfil"
        descricao="Mantenha seus dados atualizados. Eles são usados nas listas de presença e na emissão dos certificados."
      />

      <AppContainer className="py-7 sm:py-9">
        <Suspense fallback={<PerfilCarregando />}>
          <Perfil />
        </Suspense>
      </AppContainer>
    </>
  );
}

async function Perfil() {
  await connection();

  const usuario = await obterUsuario();
  if (!usuario) {
    return <AcessoRestrito variante="sessao" destinoLogin="/conta/perfil" />;
  }

  const [perfil, admin] = await Promise.all([
    obterPerfil(),
    usuarioEhAdmin(),
  ]);

  const nome = perfil?.nome_completo ?? usuario.nome ?? "Participante";
  const categoria = rotuloCategoria(perfil?.categoria);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <section className="overflow-hidden rounded-2xl border border-deep/10 bg-white shadow-suave">
        <div className="flex flex-wrap items-center gap-4 border-b border-line bg-gradient-to-r from-shell/70 to-white p-5 sm:p-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-deep font-display text-lg font-bold text-papaya ring-4 ring-white">
            {usuario.avatarUrl ? (
              <Image
                src={usuario.avatarUrl}
                alt={`Foto de perfil de ${nome}`}
                width={64}
                height={64}
                unoptimized
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              iniciais(nome)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-semibold text-deep">
              {nome}
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted">
              {usuario.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-deep/10 bg-white px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-deep">
                <IconePessoa className="h-3 w-3 text-steel-700" />
                {categoria}
              </span>
              {admin ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brick/25 bg-papaya px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-molten">
                  <IconeEscudo className="h-3 w-3" />
                  Administrador
                </span>
              ) : null}
            </div>
          </div>
          <span className="hidden h-11 w-11 items-center justify-center rounded-xl bg-papaya text-steel-700 ring-1 ring-deep/10 sm:flex">
            <IconeLapis className="h-5 w-5" />
          </span>
        </div>

        <div className="border-b border-line px-5 py-5 sm:px-6">
          <FormularioFotoPerfil nome={nome} avatarUrl={usuario.avatarUrl} />
        </div>

        <div className="p-5 sm:p-6">
          <h3 className="font-display text-lg font-semibold text-deep">
            Dados do participante
          </h3>
          <p className="mt-1 text-sm text-muted">
            Campos como categoria e e-mail são definidos pela organização.
          </p>

          <FormularioPerfil
            perfil={{
              nome_completo: nome,
              curso: perfil?.curso ?? null,
              ano_serie: perfil?.ano_serie ?? null,
              instituicao: perfil?.instituicao ?? null,
              linkedin_url: perfil?.linkedin_url ?? null,
            }}
          />
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-deep/10 bg-white p-5 shadow-suave">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-papaya text-steel-700 ring-1 ring-deep/10">
              <IconeCadeado className="h-4 w-4" />
            </span>
            <h2 className="font-display text-base font-semibold text-deep">
              Segurança
            </h2>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted">
            Defina uma nova senha de acesso. Você continua conectado neste
            navegador depois da alteração.
          </p>

          <FormularioSenha />
        </section>

        <section className="rounded-2xl border border-deep/10 bg-white p-5 shadow-suave">
          <h2 className="font-display text-base font-semibold text-deep">
            Sua conta
          </h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                E-mail
              </dt>
              <dd className="mt-0.5 break-all font-medium text-deep">
                {usuario.email ?? "Não informado"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                Categoria
              </dt>
              <dd className="mt-0.5 font-medium text-deep">{categoria}</dd>
            </div>
            {perfil?.linkedin_url ? (
              <div>
                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  LinkedIn
                </dt>
                <dd className="mt-0.5">
                  <Link
                    href={perfil.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all font-medium text-brick underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick"
                  >
                    Abrir perfil
                    <IconeSetaDiagonal className="h-3.5 w-3.5 shrink-0" />
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>

          <form action={sair} className="mt-5 border-t border-line pt-4">
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-brick/30 bg-white px-4 text-sm font-semibold text-brick transition-colors hover:bg-ember-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              <IconeSair className="h-4 w-4" />
              Sair da conta
            </button>
          </form>
        </section>

        <div className="rounded-2xl border border-deep/10 bg-shell/70 p-5">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <IconeEscudo className="mt-0.5 h-4 w-4 shrink-0 text-steel-700" />
            Precisa corrigir e-mail ou categoria? Esses campos são
            administrativos. Procure a organização do Partiu DPM.
          </p>
        </div>
      </aside>
    </div>
  );
}

function PerfilCarregando() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="h-[34rem] animate-pulse rounded-2xl border border-deep/10 bg-white" />
      <div className="space-y-6">
        <div className="h-80 animate-pulse rounded-2xl border border-deep/10 bg-white" />
        <div className="h-56 animate-pulse rounded-2xl border border-deep/10 bg-white" />
      </div>
    </div>
  );
}
