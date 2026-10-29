import { SectionHeading } from "@/components/ui/section-heading";
import { Container } from "@/components/ui/container";
import {
  IconeBilhete,
  IconeCalendario,
  IconeCertificado,
  IconeCheck,
} from "@/components/ui/icons";

const passos = [
  {
    titulo: "Encontre seu evento",
    descricao:
      "Explore a agenda e confira data, local, público-alvo e vagas antes de escolher onde participar.",
    icone: IconeCalendario,
  },
  {
    titulo: "Garanta sua vaga",
    descricao:
      "Entre com sua conta, confirme seus dados e acompanhe a confirmação da inscrição pelo portal.",
    icone: IconeBilhete,
  },
  {
    titulo: "Participe e certifique",
    descricao:
      "No dia do encontro, registre sua presença e acesse o certificado com código de validação.",
    icone: IconeCertificado,
  },
];

const publicos = [
  "Estudantes",
  "Servidores",
  "Comunidade externa",
  "Outras instituições",
];

export function ComoFunciona() {
  return (
    <section
      id="como-funciona"
      className="scroll-mt-24 border-y border-line bg-shell py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <SectionHeading
          eyebrow="Como funciona"
          titulo="Do primeiro clique ao certificado"
          descricao="Um fluxo simples para descobrir encontros, garantir sua vaga e acompanhar tudo o que você viveu no Partiu DPM."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {passos.map((passo, indice) => {
            const Icone = passo.icone;

            return (
              <article
                key={passo.titulo}
                className="group relative overflow-hidden rounded-2xl border border-deep/10 bg-white p-6 shadow-sm transition-colors hover:border-brick/30 hover:shadow-suave sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-papaya text-steel-700 ring-1 ring-deep/10">
                    <Icone className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs font-semibold text-brick">
                    0{indice + 1}
                  </span>
                </div>

                <h3 className="mt-5 font-display text-lg font-semibold text-deep">
                  {passo.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {passo.descricao}
                </p>

                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-brick opacity-0 transition-opacity group-hover:opacity-100" />
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-6 rounded-2xl border border-deep/10 bg-white p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brick">
              Para quem é
            </p>
            <h3 className="mt-2 font-display text-xl font-semibold text-deep sm:text-2xl">
              Um portal para toda a comunidade
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              A programação nasce na escola e pode ir além dela. Cada evento
              indica claramente quem pode participar.
            </p>
          </div>

          <ul className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
            {publicos.map((publico) => (
              <li
                key={publico}
                className="inline-flex items-center gap-1.5 rounded-full border border-deep/10 bg-papaya px-3 py-1.5 text-xs font-medium text-deep"
              >
                <IconeCheck className="h-3.5 w-3.5 text-brick" />
                {publico}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
