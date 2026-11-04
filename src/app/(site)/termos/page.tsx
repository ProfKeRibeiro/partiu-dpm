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
            Partiu DPM · Etec DPM
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-deep">
            Termos de uso e consentimento
          </h1>
          <p className="mt-3 text-sm text-muted">
            Versão de {ATUALIZADO}. Leia com atenção antes de criar sua conta ou
            de se inscrever em um evento.
          </p>

          <Secao titulo="1. Quem trata seus dados">
            <p>
              O portal Partiu DPM é mantido pela Etec DPM, que atua como
              controladora dos dados pessoais coletados. Dúvidas, pedidos e
              exercício de direitos podem ser enviados para{" "}
              <a
                className="font-semibold text-brick underline underline-offset-4"
                href="mailto:profke.ribeiro@gmail.com"
              >
                profke.ribeiro@gmail.com
              </a>
              .
            </p>
          </Secao>

          <Secao titulo="2. Quais dados coletamos">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Cadastro:</strong> nome completo, e-mail, senha, categoria
                (aluno, servidor ou público externo), curso, série ou ano e
                instituição de ensino.
              </li>
              <li>
                <strong>Participação:</strong> inscrições, lista de espera,
                presenças, certificados e, quando o evento for em equipe, nome da
                equipe e dados do professor orientador.
              </li>
              <li>
                <strong>Opcionais:</strong> foto de perfil e link do LinkedIn,
                quando você decide preencher.
              </li>
              <li>
                <strong>Técnicos:</strong> data e hora de acesso, endereço IP e
                navegador, usados para segurança e prevenção a fraude.
              </li>
            </ul>
            <p>
              Não pedimos CPF, endereço residencial, telefone ou documentos sem
              necessidade para a finalidade do evento. Quando um evento exigir
              dado adicional, ele será informado antes da inscrição.
            </p>
          </Secao>

          <Secao titulo="3. Para que usamos os dados">
            <ul className="list-disc space-y-2 pl-5">
              <li>Criar e manter sua conta e permitir o login.</li>
              <li>Realizar inscrições, controle de vagas, lista de espera e presença.</li>
              <li>Emitir e validar certificados.</li>
              <li>Enviar avisos operacionais do evento por e-mail e no portal.</li>
              <li>
                Enviar comunicações sobre outros eventos, cursos e processos
                seletivos, somente se você autorizar expressamente.
              </li>
              <li>Proteger o portal, prevenir abuso e cumprir obrigações legais.</li>
            </ul>
          </Secao>

          <Secao titulo="4. Bases legais">
            <p>
              Tratamos dados para executar o serviço que você solicitou (art. 7º,
              V, da LGPD), para cumprir obrigações legais e regulatórias (art. 7º,
              II), para segurança e prevenção a fraudes com base em legítimo
              interesse (art. 7º, IX) e, quando houver envio de comunicações
              institucionais, com base no seu consentimento (art. 7º, I).
            </p>
            <p>
              O consentimento para receber comunicações é <strong>opcional</strong>{" "}
              e não condiciona sua conta nem sua participação em eventos. Você
              pode retirá-lo a qualquer momento.
            </p>
          </Secao>

          <Secao titulo="5. Menores de idade">
            <p>
              Quando o titular for menor de 18 anos, o tratamento observa o art.
              14 da LGPD e o Estatuto Digital da Criança e do Adolescente (Lei nº
              15.211/2025): coletamos apenas os dados necessários, no melhor
              interesse do menor, e exigimos consentimento específico e destacado
              de pelo menos um dos pais ou do responsável legal.
            </p>
            <p>
              Esse consentimento é coletado por link enviado ao e-mail informado
              do responsável, com registro de data, hora e origem do aceite. Sem
              a confirmação do responsável, a inscrição do menor não é validada.
            </p>
          </Secao>

          <Secao titulo="6. Compartilhamento">
            <p>
              Não vendemos dados pessoais. Usamos prestadores que apenas
              hospedam e operam o serviço: Supabase (banco de dados e arquivos),
              Vercel (hospedagem do site) e Brevo (envio de e-mails). O
              compartilhamento ocorre apenas para essa operação, para cumprimento
              de obrigação legal ou mediante seu consentimento.
            </p>
          </Secao>

          <Secao titulo="7. Por quanto tempo guardamos">
            <p>
              Os dados da conta ficam armazenados enquanto ela existir. Inscrições
              e certificados podem ser mantidos por prazo necessário à comprovação
              de participação e ao cumprimento de obrigações legais. Depois desse
              prazo, os dados são eliminados ou anonimizados.
            </p>
          </Secao>

          <Secao titulo="8. Seus direitos">
            <p>
              Você pode solicitar confirmação de tratamento, acesso, correção,
              anonimização, bloqueio ou eliminação, portabilidade, informação sobre
              compartilhamento e revogação de consentimento. Basta escrever para o
              e-mail de contato acima. Responderemos nos prazos da LGPD.
            </p>
          </Secao>

          <Secao titulo="9. Segurança">
            <p>
              O acesso é protegido por autenticação, cada pessoa vê apenas os
              próprios dados e a organização acessa o necessário para operar os
              eventos. Mesmo assim, nenhum sistema é totalmente imune: em caso de
              incidente relevante, os titulares serão comunicados conforme a lei.
            </p>
          </Secao>

          <Secao titulo="10. Aceite">
            <p>
              Ao criar a conta você declara que leu estes termos. Se for menor de
              18 anos, declara também que informou o e-mail de um responsável, que
              receberá o pedido de autorização.
            </p>
            <p>
              Versão {ATUALIZADO}. Alterações relevantes serão avisadas no portal
              antes de valerem.
            </p>
          </Secao>

          <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
            Veja também a{" "}
            <Link
              href="/privacidade"
              className="font-semibold text-brick underline underline-offset-4"
            >
              política de privacidade
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
