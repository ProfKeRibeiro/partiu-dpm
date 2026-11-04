import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Termos de uso e consentimento",
  description:
    "Termos de uso do Partiu DPM e consentimento para tratamento de dados pessoais, conforme a LGPD.",
};

const ATUALIZADO = "3 de novembro de 2026";

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
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

export default function TermosPage() {
  return (
    <main className="flex-1 bg-canvas py-12 sm:py-16">
      <Container>
        <article className="mx-auto max-w-3xl rounded-2xl border border-deep/10 bg-white p-6 shadow-suave sm:p-10">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-brick">
            Partiu DPM Â· Etec DPM
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-deep">
            Termos de uso e consentimento
          </h1>
          <p className="mt-3 text-sm text-muted">
            VersÃ£o de {ATUALIZADO}. Leia com atenÃ§Ã£o antes de criar sua conta ou
            de se inscrever em um evento.
          </p>

          <Secao titulo="1. Quem trata seus dados">
            <p>
              O portal Partiu DPM Ã© mantido pela Etec DPM, que atua como
              controladora dos dados pessoais coletados. DÃºvidas, pedidos e
              exercÃ­cio de direitos podem ser enviados para{" "}
              <a
                className="font-semibold text-brick underline underline-offset-4"
                href="mailto:e261dir@cps.sp.gov.br"
              >
                e261dir@cps.sp.gov.br
              </a>
              .
            </p>
          </Secao>

          <Secao titulo="2. Quais dados coletamos">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Cadastro:</strong> nome completo, e-mail, senha, categoria
                (aluno, servidor ou pÃºblico externo), curso, sÃ©rie ou ano e
                instituiÃ§Ã£o de ensino.
              </li>
              <li>
                <strong>ParticipaÃ§Ã£o:</strong> inscriÃ§Ãµes, lista de espera,
                presenÃ§as, certificados e, quando o evento for em equipe, nome da
                equipe e dados do professor orientador.
              </li>
              <li>
                <strong>Opcionais:</strong> foto de perfil e link do LinkedIn,
                quando vocÃª decide preencher.
              </li>
              <li>
                <strong>TÃ©cnicos:</strong> data e hora de acesso, endereÃ§o IP e
                navegador, usados para seguranÃ§a e prevenÃ§Ã£o a fraude.
              </li>
            </ul>
            <p>
              NÃ£o pedimos CPF, endereÃ§o residencial, telefone ou documentos sem
              necessidade para a finalidade do evento. Quando um evento exigir
              dado adicional, ele serÃ¡ informado antes da inscriÃ§Ã£o.
            </p>
          </Secao>

          <Secao titulo="3. Para que usamos os dados">
            <ul className="list-disc space-y-2 pl-5">
              <li>Criar e manter sua conta e permitir o login.</li>
              <li>Realizar inscriÃ§Ãµes, controle de vagas, lista de espera e presenÃ§a.</li>
              <li>Emitir e validar certificados.</li>
              <li>Enviar avisos operacionais do evento por e-mail e no portal.</li>
              <li>
                Enviar comunicaÃ§Ãµes sobre outros eventos, cursos e processos
                seletivos, somente se vocÃª autorizar expressamente.
              </li>
              <li>Proteger o portal, prevenir abuso e cumprir obrigaÃ§Ãµes legais.</li>
            </ul>
          </Secao>

          <Secao titulo="4. Bases legais">
            <p>
              Tratamos dados para executar o serviÃ§o que vocÃª solicitou (art. 7Âº,
              V, da LGPD), para cumprir obrigaÃ§Ãµes legais e regulatÃ³rias (art. 7Âº,
              II), para seguranÃ§a e prevenÃ§Ã£o a fraudes com base em legÃ­timo
              interesse (art. 7Âº, IX) e, quando houver envio de comunicaÃ§Ãµes
              institucionais, com base no seu consentimento (art. 7Âº, I).
            </p>
            <p>
              O consentimento para receber comunicaÃ§Ãµes Ã© <strong>opcional</strong>{" "}
              e nÃ£o condiciona sua conta nem sua participaÃ§Ã£o em eventos. VocÃª
              pode retirÃ¡-lo a qualquer momento.
            </p>
          </Secao>

          <Secao titulo="5. Menores de idade">
            <p>
              Quando o titular for menor de 18 anos, o tratamento observa o art.
              14 da LGPD e o Estatuto Digital da CrianÃ§a e do Adolescente (Lei nÂº
              15.211/2025): coletamos apenas os dados necessÃ¡rios, no melhor
              interesse do menor, e exigimos consentimento especÃ­fico e destacado
              de pelo menos um dos pais ou do responsÃ¡vel legal.
            </p>
            <p>
              Esse consentimento Ã© coletado por link enviado ao e-mail informado
              do responsÃ¡vel, com registro de data, hora e origem do aceite. Sem
              a confirmaÃ§Ã£o do responsÃ¡vel, a inscriÃ§Ã£o do menor nÃ£o Ã© validada.
            </p>
          </Secao>

          <Secao titulo="6. Compartilhamento">
            <p>
              NÃ£o vendemos dados pessoais. Usamos prestadores que apenas
              hospedam e operam o serviÃ§o: Supabase (banco de dados e arquivos),
              Vercel (hospedagem do site) e Brevo (envio de e-mails). O
              compartilhamento ocorre apenas para essa operaÃ§Ã£o, para cumprimento
              de obrigaÃ§Ã£o legal ou mediante seu consentimento.
            </p>
          </Secao>

          <Secao titulo="7. Por quanto tempo guardamos">
            <p>
              Os dados da conta ficam armazenados enquanto ela existir. InscriÃ§Ãµes
              e certificados podem ser mantidos por prazo necessÃ¡rio Ã  comprovaÃ§Ã£o
              de participaÃ§Ã£o e ao cumprimento de obrigaÃ§Ãµes legais. Depois desse
              prazo, os dados sÃ£o eliminados ou anonimizados.
            </p>
          </Secao>

          <Secao titulo="8. Seus direitos">
            <p>
              VocÃª pode solicitar confirmaÃ§Ã£o de tratamento, acesso, correÃ§Ã£o,
              anonimizaÃ§Ã£o, bloqueio ou eliminaÃ§Ã£o, portabilidade, informaÃ§Ã£o sobre
              compartilhamento e revogaÃ§Ã£o de consentimento. Basta escrever para o
              e-mail de contato acima. Responderemos nos prazos da LGPD.
            </p>
          </Secao>

          <Secao titulo="9. SeguranÃ§a">
            <p>
              O acesso Ã© protegido por autenticaÃ§Ã£o, cada pessoa vÃª apenas os
              prÃ³prios dados e a organizaÃ§Ã£o acessa o necessÃ¡rio para operar os
              eventos. Mesmo assim, nenhum sistema Ã© totalmente imune: em caso de
              incidente relevante, os titulares serÃ£o comunicados conforme a lei.
            </p>
          </Secao>

          <Secao titulo="10. Aceite">
            <p>
              Ao criar a conta vocÃª declara que leu estes termos. Se for menor de
              18 anos, declara tambÃ©m que informou o e-mail de um responsÃ¡vel, que
              receberÃ¡ o pedido de autorizaÃ§Ã£o.
            </p>
            <p>
              VersÃ£o {ATUALIZADO}. AlteraÃ§Ãµes relevantes serÃ£o avisadas no portal
              antes de valerem.
            </p>
          </Secao>

          <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
            Veja tambÃ©m a{" "}
            <Link
              href="/privacidade"
              className="font-semibold text-brick underline underline-offset-4"
            >
              polÃ­tica de privacidade
            </Link>{" "}
            e volte para{" "}
            <Link
              href="/entrar"
              className="font-semibold text-brick underline underline-offset-4"
            >
              entrar ou criar conta
            </Link>
            .
          </p>
        </article>
      </Container>
    </main>
  );
}
