import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "PolÃ­tica de privacidade",
  description:
    "Como o Partiu DPM coleta, usa e protege dados pessoais, incluindo dados de menores e consentimento dos responsÃ¡veis.",
};

const ATUALIZADO = "3 de novembro de 2026";

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight text-deep">
        {titulo}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink">
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadePage() {
  return (
    <main className="flex-1 bg-canvas py-12 sm:py-16">
      <Container>
        <article className="mx-auto max-w-3xl rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-10">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-brick">
            Partiu DPM Â· Etec DPM
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-deep">
            PolÃ­tica de privacidade
          </h1>
          <p className="mt-3 text-sm text-muted">VersÃ£o de {ATUALIZADO}.</p>

          <Bloco titulo="Resumo">
            <p>
              Coletamos apenas o necessÃ¡rio para criar sua conta, inscrever vocÃª
              nos eventos e emitir certificados. NÃ£o vendemos dados. ComunicaÃ§Ãµes
              de divulgaÃ§Ã£o sÃ³ sÃ£o enviadas com seu consentimento â€” e, se vocÃª for
              menor de idade, com autorizaÃ§Ã£o de um responsÃ¡vel.
            </p>
          </Bloco>

          <Bloco titulo="Dados, finalidade e base legal">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[0.65rem] uppercase tracking-wider text-muted">
                    <th className="py-2 pr-3">Dado</th>
                    <th className="py-2 pr-3">Finalidade</th>
                    <th className="py-2">Base legal</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  <tr className="border-b border-line/60">
                    <td className="py-2 pr-3">Nome, e-mail, senha</td>
                    <td className="py-2 pr-3">Conta e login</td>
                    <td className="py-2">ExecuÃ§Ã£o de serviÃ§o (art. 7Âº, V)</td>
                  </tr>
                  <tr className="border-b border-line/60">
                    <td className="py-2 pr-3">Curso, sÃ©rie, instituiÃ§Ã£o</td>
                    <td className="py-2 pr-3">Elegibilidade em eventos</td>
                    <td className="py-2">ExecuÃ§Ã£o de serviÃ§o (art. 7Âº, V)</td>
                  </tr>
                  <tr className="border-b border-line/60">
                    <td className="py-2 pr-3">InscriÃ§Ãµes e presenÃ§as</td>
                    <td className="py-2 pr-3">Vagas, lista de espera, certificados</td>
                    <td className="py-2">ExecuÃ§Ã£o de serviÃ§o / obrigaÃ§Ã£o legal</td>
                  </tr>
                  <tr className="border-b border-line/60">
                    <td className="py-2 pr-3">IP, data/hora, navegador</td>
                    <td className="py-2 pr-3">SeguranÃ§a e prevenÃ§Ã£o a abuso</td>
                    <td className="py-2">LegÃ­timo interesse (art. 7Âº, IX)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3">E-mail para divulgaÃ§Ã£o</td>
                    <td className="py-2 pr-3">ComunicaÃ§Ãµes institucionais</td>
                    <td className="py-2">Consentimento (art. 7Âº, I)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Bloco>

          <Bloco titulo="Menores de idade e responsÃ¡veis">
            <p>
              Para inscriÃ§Ãµes de menores de 18 anos exigimos consentimento
              especÃ­fico e destacado de pelo menos um dos pais ou do responsÃ¡vel
              legal (art. 14 da LGPD e Lei nÂº 15.211/2025). O pedido Ã© enviado por
              e-mail ao responsÃ¡vel informado, que lÃª o termo e confirma
              digitalmente; guardamos data, hora e origem do aceite como prova.
            </p>
            <p>
              Sem essa confirmaÃ§Ã£o, a inscriÃ§Ã£o do menor fica pendente. O
              responsÃ¡vel pode revogar a autorizaÃ§Ã£o a qualquer momento pelo canal
              de contato abaixo.
            </p>
          </Bloco>

          <Bloco titulo="Eventos com escolas (FETEC)">
            <p>
              Em eventos com participaÃ§Ã£o de escolas, a inscriÃ§Ã£o da escola Ã©
              feita por um professor ou coordenador com e-mail institucional. O
              sistema gera um link de subinscriÃ§Ã£o: o prÃ³prio aluno se cadastra,
              informa o e-mail do responsÃ¡vel e sÃ³ Ã© confirmado apÃ³s a autorizaÃ§Ã£o
              dele.
            </p>
          </Bloco>

          <Bloco titulo="Sorteios">
            <p>
              A participaÃ§Ã£o em sorteio usa apenas os dados necessÃ¡rios Ã 
              identificaÃ§Ã£o do visitante (nome e e-mail). A autorizaÃ§Ã£o para o
              sorteio Ã© separada da autorizaÃ§Ã£o para receber comunicaÃ§Ãµes: recusar
              a divulgaÃ§Ã£o nÃ£o impede de concorrer. Menores precisam da
              autorizaÃ§Ã£o do responsÃ¡vel tambÃ©m para o sorteio.
            </p>
          </Bloco>

          <Bloco titulo="Cookies e armazenamento local">
            <p>
              Usamos apenas cookies essenciais de sessÃ£o para manter vocÃª
              autenticado. NÃ£o usamos cookies de publicidade nem rastreadores de
              terceiros para perfilamento.
            </p>
          </Bloco>

          <Bloco titulo="RetenÃ§Ã£o">
            <p>
              Dados de conta enquanto ela existir; inscriÃ§Ãµes e certificados pelo
              prazo necessÃ¡rio Ã  comprovaÃ§Ã£o de participaÃ§Ã£o e Ã s obrigaÃ§Ãµes
              legais; registros de consentimento enquanto a autorizaÃ§Ã£o puder ser
              questionada. Depois, os dados sÃ£o eliminados ou anonimizados.
            </p>
          </Bloco>

          <Bloco titulo="Compartilhamento">
            <p>
              Apenas com operadores necessÃ¡rios: Supabase (banco e arquivos),
              Vercel (hospedagem) e Brevo (e-mail). NÃ£o hÃ¡ venda de dados nem uso
              para finalidade diferente da informada.
            </p>
          </Bloco>

          <Bloco titulo="Seus direitos">
            <p>
              Acesso, correÃ§Ã£o, eliminaÃ§Ã£o, portabilidade, informaÃ§Ã£o sobre
              compartilhamento e revogaÃ§Ã£o de consentimento: escreva para{" "}
              <a
                className="font-semibold text-brick underline underline-offset-4"
                href="mailto:e261dir@cps.sp.gov.br"
              >
                e261dir@cps.sp.gov.br
              </a>
              . Responderemos nos prazos da LGPD.
            </p>
          </Bloco>

          <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
            Leia tambÃ©m os{" "}
            <Link
              href="/termos"
              className="font-semibold text-brick underline underline-offset-4"
            >
              termos de uso e consentimento
            </Link>
            .
          </p>
        </article>
      </Container>
    </main>
  );
}
