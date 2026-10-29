import Link from "next/link";
import { LogoClara } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import {
  IconeCadeado,
  IconeEscudo,
  IconeUsuarios,
} from "@/components/ui/icons";

const ANO_ATUAL = new Date().getFullYear();

const navegacao = [
  { href: "/eventos", rotulo: "Eventos" },
  { href: "/#como-funciona", rotulo: "Como funciona" },
];

const acesso = [
  { href: "/conta", rotulo: "Minha área", icone: IconeUsuarios },
  { href: "/certificados", rotulo: "Validar certificado", icone: IconeEscudo },
  { href: "/admin", rotulo: "Administração", icone: IconeCadeado },
];

const rotuloSecao =
  "text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-steel-300";

export function SiteFooter() {
  return (
    <footer className="border-t-[3px] border-brick bg-deep text-papaya">
      <Container className="py-8 sm:py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <LogoClara className="h-24 w-24" />
          </div>

          <nav aria-label="Navegação do rodapé">
            <h2 className={rotuloSecao}>Navegação</h2>
            <ul className="mt-3 space-y-2">
              {navegacao.map((link) => (
                <li key={link.rotulo}>
                  <Link
                    href={link.href}
                    className="text-sm text-papaya/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papaya"
                  >
                    {link.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={rotuloSecao}>Acesso</h2>
            <ul className="mt-3 space-y-2">
              {acesso.map((link) => {
                const Icone = link.icone;

                return (
                  <li key={link.rotulo}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-sm text-papaya/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papaya"
                    >
                      <Icone className="h-4 w-4 text-steel-300 transition-colors group-hover:text-papaya" />
                      {link.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-papaya/15 pt-4 text-xs text-papaya/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© {ANO_ATUAL} Partiu DPM. Todos os direitos reservados.</p>
        </div>
      </Container>
    </footer>
  );
}
