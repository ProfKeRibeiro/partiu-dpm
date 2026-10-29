# Partiu DPM

Portal de eventos da ETEC Darcy Pereira de Moraes. A aplicação reúne a agenda,
as páginas de detalhe, a inscrição transacional, a área do participante, o painel
da organização e a validação pública de certificados, com uma identidade visual
jovem, técnica e responsiva.

O projeto está funcional de ponta a ponta no ambiente local:

- leitura pública apenas de eventos `publicado`;
- autenticação por e-mail e senha;
- inscrição e cancelamento com validação de vagas, prazo, público e duplicidade;
- área do participante com perfil, inscrições, presenças e certificados;
- painel administrativo protegido por `public.eh_admin()`;
- presença, emissão/cancelamento de certificado e alteração de status;
- validação pública de certificado por código.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Cache Components e Partial
  Prefetching)
- React 19 e TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL, Auth e RLS) via `@supabase/supabase-js` e
  `@supabase/ssr`
- Fontes Poppins (interface) e Geist Mono (código), via `next/font`
- Ícones [Lucide](https://lucide.dev) (`lucide-react`)

## Identidade visual

A paleta oficial está definida em `src/app/globals.css`:

| Token | Hex | Uso principal |
| --- | --- | --- |
| `--color-molten` | `#780000` | Ênfase e textos sobre papaya. |
| `--color-brick` | `#c1121f` | Ações de destaque, detalhes e foco. |
| `--color-papaya` | `#fdf0d5` | Fundo quente de heros e faixas. |
| `--color-deep` | `#003049` | Texto, botões primários e rodapé. |
| `--color-steel` | `#669bbc` | Apoio: ícones em fundos escuros e bordas. |

Os componentes usam os utilitários `molten`, `brick`, `papaya`, `deep`,
`steel`, os neutros `canvas`, `shell`, `line`, `ink` e `muted`, a escala
`steel-50…900` e os aliases históricos (`navy`, `mint`, `ember`, `paper`)
remapeados para a mesma paleta.

O `steel` puro tem contraste de ~3:1 sobre branco e ~2,7:1 sobre papaya, então
não é usado como cor de texto nesses fundos. Textos secundários usam `muted`
(`#506676`) ou `steel-700` (`#2f5f7d`), que passam de 6:1.

A marca é o **selo oficial** enviado pela organização, um PNG circular com
transparência renderizado por `src/components/brand/logo.tsx` com `next/image`.
O wordmark “Partiu DPM” foi removido: o selo redondo é a única marca exibida no
cabeçalho, na sidebar, no rodapé e nas telas internas. As versões otimizadas ficam
em `public/marca/` (`logo-oficial-192.png`, `logo-oficial-512.png`,
`logo-oficial-512.webp` e `logo-oficial-96.png`), o arquivo de uso geral em
`public/logo-partiu-dpm.png` e os ícones do app em `src/app/icon.png` e
`src/app/apple-icon.png`. O original em alta resolução é preservado fora da
pasta pública em `assets/logo-oficial-original.png`.

Os elementos gráficos da referência visual ficam em `public/marca/`:

| Arquivo | Uso |
| --- | --- |
| `fachada-etec.webp` | Foto da fachada com overlay navy nos heros da home e da área do participante. |
| `seta-vermelha.png` | Seta/plano vermelho da marca no lado direito dos heros. |
| `seta-azul.png` | Seta azul de apoio no rodapé da sidebar. |

Os ícones usam Lucide por meio de `src/components/ui/icons.tsx`, que mantém os
nomes `IconeCasa`, `IconeCalendario`, `IconeBilhete`, `IconeCertificado` etc.
para desacoplar os componentes da biblioteca. O traço arredondado e o desenho
aberto ficam próximos dos ícones da referência.

## Requisitos

- Node.js 20.9 ou superior
- npm
- Um projeto Supabase (opcional para visualizar a prévia)

## Como rodar

```bash
npm install
cp .env.example .env.local
# preencha as variáveis no .env.local
npm run dev
```

Abra <http://localhost:3000>.

Sem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, a aplicação
entra em **modo de demonstração**: exibe quatro eventos fictícios e um aviso
claro de que os dados não são reais. Login, inscrição e painel ficam
indisponíveis nesse modo.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Para dados reais | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Para dados reais | Chave pública `anon`/publishable. É exposta ao navegador por design. |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | URL pública do site, usada em metadados e links absolutos. |

Regras:

- Copie apenas `.env.example` para o repositório. `.env.local` é ignorado pelo
  Git.
- **Nunca** use a chave `service_role` no frontend, em `NEXT_PUBLIC_*` ou em
  código versionado. Ela ignora a RLS.
- Variáveis `NEXT_PUBLIC_*` são incorporadas ao bundle do navegador. Não coloque
  segredos nelas.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento. |
| `npm run build` | Build de produção. |
| `npm run start` | Servidor de produção após o build. |
| `npm run lint` | ESLint. |
| `npx tsc --noEmit` | Verificação de tipos. |

## Rotas

| Rota | Acesso | Conteúdo |
| --- | --- | --- |
| `/` | Público | Home com hero da fachada, boas-vindas, indicadores e próximos encontros. |
| `/eventos` | Público | Agenda de eventos publicados. |
| `/eventos/[id]` | Público | Detalhe, vagas, inscrição, cancelamento e link do inscrito. |
| `/entrar` | Público | Login e criação de conta. |
| `/conta` | Sessão | Painel do participante com boas-vindas, agenda e atalhos. |
| `/conta/eventos` | Sessão | Agenda com busca, filtros por tipo/modalidade e paginação. |
| `/conta/inscricoes` | Sessão | Inscrições por status, cancelamento, presença e certificado. |
| `/conta/certificados` | Sessão | Certificados emitidos e acesso à versão de impressão. |
| `/conta/perfil` | Sessão | Dados do participante, troca de senha e saída da conta. |
| `/certificados` | Público | Consulta por código de validação. |
| `/certificados/[codigo]` | Público | Certificado válido e versão para impressão. |
| `/admin` | Admin | Painel com todos os eventos. |
| `/admin/eventos/[id]` | Admin | Inscritos, presença, certificado e status. |

Todas as rotas de `/conta` são barradas no proxy quando não há sessão (`307`
para `/entrar?next=...`). A autorização de administrador é sempre reavaliada no
servidor e no banco com `eh_admin()`; quem não é admin vê um estado explícito de
“Área restrita à organização”, sem dados.

O site público e a área do participante usam shells diferentes por meio de
route groups: `(site)` monta o cabeçalho e o rodapé institucionais, enquanto
`(app)` monta a sidebar navy, a topbar e o conteúdo autenticado.

## Estrutura

```text
src/
  proxy.ts                    Renovação de sessão + guarda de presença de sessão
  app/
    layout.tsx                HTML, fontes, metadados globais e skip link
    globals.css               Tokens e tema da marca
    not-found.tsx             Página 404
    error.tsx                 Limite de erro
    (site)/
      layout.tsx              Cabeçalho e rodapé institucionais
      page.tsx                Home
      eventos/page.tsx        Agenda
      eventos/[id]/page.tsx   Detalhe e inscrição
      entrar/page.tsx         Login/cadastro
      certificados/           Consulta e certificado
      admin/                  Painel administrativo
    (app)/
      layout.tsx              Sessão + AppShell + sidebar/topbar
      conta/page.tsx          Painel do participante
      conta/eventos/          Agenda autenticada
      conta/inscricoes/       Inscrições por status
      conta/certificados/     Certificados emitidos
      conta/perfil/           Perfil e segurança
  components/
    app/                      Shell, sidebar, topbar, cards e estados da área logada
    auth/                     Formulários e estados de acesso
    brand/                    Selo oficial (sem wordmark)
    certificados/             Consulta e impressão
    eventos/                  Cards, selos, agenda, detalhe e ações
    home/                     Seções da home
    inscricoes/               Cancelamento
    ui/                       Container, botões, ícones, aviso de prévia
  lib/
    admin/                    Consultas e Server Actions do painel
    app-utils.ts              Primeiro nome, iniciais, categoria e links
    auth/                     Sessão e Server Actions de autenticação
    certificados/             Validação pública
    eventos.ts                Consultas e mapeamento dos eventos
    demo-eventos.ts           Dados fictícios do modo de demonstração
    evento-utils.ts           Regras de exibição de status e vagas
    env.ts                    Validação das variáveis públicas
    format.ts                 Formatação de datas e períodos
    inscricoes/               Consultas e Server Actions de inscrição
    supabase/                 Clientes browser, server, público e proxy
  types/evento.ts             Tipos de domínio
docs/
  banco-de-dados.md           Contrato do schema, grants, RPCs e testes
  seguranca-rls.md            Modelo de segurança, achados e checklist
```

## Como os dados são lidos

1. O cliente público (`src/lib/supabase/public.ts`) usa apenas a chave pública,
   não lê cookies e não mantém sessão.
2. A consulta pede `eventos` com `status = 'publicado'` e uma **lista explícita
   de colunas** (`CAMPOS_EVENTO_PUBLICO`), compatível com o grant por coluna.
3. A página de detalhes valida o formato UUID, exige `status = 'publicado'` e,
   quando há sessão, consulta a inscrição do usuário e pede o link por RPC.
4. `link_evento` não é legível por `anon` nem por `authenticated` via tabela.
   O link é devolvido apenas por `link_evento_do_inscrito(uuid)`, que exige
   inscrição `confirmada` ou admin.
5. A escrita em `inscricoes` é feita exclusivamente pelas RPCs
   `inscrever_em_evento` e `cancelar_inscricao`.
6. O perfil é lido pelo próprio usuário e editado pela RPC
   `atualizar_perfil_participante`; `categoria` não é editável pelo participante.
7. O banco está sem eventos cadastrados. Com o Supabase real configurado, o
   portal exibe o estado vazio até o primeiro evento publicado.

## Autenticação

- Login e cadastro usam `supabase.auth` com e-mail e senha.
- O fluxo de confirmação de e-mail é suportado; se a confirmação estiver ativa no
  projeto, o usuário recebe o aviso após o cadastro.
- A sessão é renovada no proxy com `getClaims()` e persistida em cookies por
  `@supabase/ssr`.
- Server Actions revalidam a sessão e os dados no servidor. Nenhuma decisão de
  autorização depende do cliente.
- Ao entrar, o destino é `/conta` (ou o `next` informado, quando é um caminho
  interno).

## Área do participante

- O layout `(app)` autentica dentro de um `<Suspense>` com um esqueleto de
  carregamento (`ShellCarregando`); sem sessão, mostra `AcessoRestrito` com link
  para o login em vez de trocar a resposta por um redirecionamento durante o
  streaming.
- `AppShell` mantém a sidebar fixa em telas grandes e um drawer acessível no
  mobile, com foco, `Escape` e bloqueio de rolagem.
- A sidebar exibe apenas o selo redondo (sem wordmark) e quatro caminhos:
  **Início** (`/`, volta ao site público), **Eventos**, **Minhas inscrições** e
  **Meus certificados**. O selo do topo leva a `/conta`; o perfil e a saída
  ficam no menu do avatar.
- A topbar tem busca de eventos (GET para `/conta/eventos`), sino com indicador
  de inscrições confirmadas e menu da conta com **Meu perfil** e **Sair**.
  Inscrições e certificados não são repetidos no menu, porque já estão na
  sidebar.
- O painel `/conta` combina hero navy sobre a fachada da ETEC, seta vermelha da
  marca, números de inscrições/certificados, cards de próximos eventos e a lista
  “Seus próximos eventos”. Não há card de perfil nem banner de CTA duplicado.
- A home pública usa o mesmo padrão visual: hero navy com a fachada, seta
  vermelha, mensagem “Bem-vindo(a)!” e um único CTA para a agenda. O cabeçalho
  traz só “Minha área” como ação, além dos links de navegação; o rodapé tem uma
  coluna de acesso com apenas três caminhos.
- `/conta/eventos` filtra em memória por `q`, `tipo` e `modalidade`, ordena
  futuros antes de passados e pagina de 9 em 9 direto na URL.
- `/conta/inscricoes` separa `todas`, `confirmada`, `lista_espera` e `cancelada`,
  com contadores, presença, certificado e cancelamento quando o evento ainda não
  começou.
- `/conta/certificados` só lista certificados `emitido` e leva para a página
  pública do certificado, onde o navegador oferece **Imprimir / PDF**.
- `/conta/perfil` edita os campos do participante, troca a senha de verdade com
  `supabase.auth.updateUser` (sessão atual, confirmação dupla) e permite sair.
  Categoria e e-mail continuam administrativos.
- As consultas de usuário, perfil, admin e inscrições usam `cache()` do React
  para não repetir a mesma leitura no mesmo request.

## Inscrições

- `inscrever_em_evento(evento_id)` bloqueia o evento com `FOR UPDATE`, valida
  status, prazo, público-alvo, curso, série, duplicidade e vagas.
- `cancelar_inscricao(inscricao_id)` aceita o dono ou admin e impede
  cancelamento depois do início do evento.
- O contador `eventos.inscritos` é mantido por trigger; a RPC usa `count(*)`
  como fonte autoritativa para vagas.
- A interface mostra os estados de inscrição aberta, em breve, encerrada,
  esgotada, confirmada, lista de espera e cancelada.

## Painel administrativo

- Protegido por `usuarioEhAdmin()` no servidor e por `eh_admin()` nas RPCs.
- Lista todos os eventos, independentemente do status.
- Em `/admin/eventos/[id]`: lista inscritos com e-mail, curso, série,
  instituição, presença e certificado.
- Ações: marcar/desmarcar presença, emitir/reemitir certificado, cancelar
  certificado e alterar o status da inscrição.
- Todas as RPCs administrativas lançam `42501 nao_autorizado` para quem não é
  admin, mesmo que a chamada seja feita fora da interface.

## Certificados

- A emissão exige inscrição `confirmada` e presença registrada.
- Cada certificado tem um `codigo_validacao` UUID público.
- `/certificados` permite consultar pelo código.
- `/certificados/[codigo]` valida via `validar_certificado(uuid)` e exibe apenas
  nome, evento, data, modalidade e local; certificados cancelados não são
  exibidos.
- `/api/certificados/[codigo]/imagem` gera o PNG pronto para impressão a partir
  de `assets/certificado_partiu-dpm.png`, preenchendo nome, evento, data,
  carga horária calculada e data de emissão. A rota só responde para
  certificados emitidos e válidos.
- A página tem versão de impressão.

## Segurança

- A RLS permanece habilitada; nada nesta aplicação a desativa.
- A autorização administrativa usa `public.eh_admin()` e a tabela
  `administradores`, nunca `user_metadata`.
- O proxy renova a sessão e barra `/conta` e `/admin` sem sessão; a autorização
  de admin continua no servidor/banco.
- Inscrições são transacionais e validadas no banco. `authenticated` não tem
  `INSERT`/`UPDATE` direto em `inscricoes`.
- `anon` não tem acesso de tabela a `eventos`; recebe apenas `SELECT` nas
  colunas públicas, sem `link_evento`.
- `authenticated` também não lê `link_evento` diretamente.
- `.env.local` não é versionado e a chave `service_role` não é usada.
- Cabeçalhos `nosniff`, `Referrer-Policy`, `X-Frame-Options` e
  `Permissions-Policy` são aplicados globalmente.

Detalhes e checklist: `docs/seguranca-rls.md`.

## Validação executada

Em 28/10/2026, com build de produção (`next start` na porta 3100) e dados
temporários removidos ao final:

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Sem erros. |
| `npx tsc --noEmit` | Sem erros. |
| `npm run build` | 19 rotas geradas (incluindo ícones e manifest). |
| Rotas públicas `/`, `/eventos`, `/certificados`, `/entrar` | `200`. |
| `/conta`, `/conta/eventos`, `/conta/inscricoes`, `/conta/certificados`, `/conta/perfil` sem sessão | `307` para `/entrar?next=...`. |
| As cinco telas de `/conta` com sessão | `200`, shell completo, sem `__next_error__`. |
| `/admin` como usuário comum | “Área restrita à organização”, sem dados. |
| `/admin` e `/admin/eventos/[id]` como admin | Painel e inscritos renderizados. |
| `inscrever_em_evento` | `{ok:true,codigo:"inscrito"}`. |
| `admin_listar_inscricoes` como não-admin | `403 nao_autorizado`. |
| `admin_definir_presenca` | `{ok:true,presente:true}`. |
| `admin_emitir_certificado` | Código de validação válido publicamente. |
| `atualizar_perfil_participante` | `atualizado`, validações e `401` para `anon`. |
| `link_evento` via tabela | Negado; disponível só pela RPC do inscrito. |
| Perfil pela interface | Nome e curso salvos e mensagem de sucesso exibida. |
| Troca de senha pela interface | Senha antiga rejeitada (`400`) e nova aceita (`200`) no login. |
| Navegação da sidebar | **Início** aponta para `/`; o selo aponta para `/conta`; perfil e saída no menu do avatar. |
| Home e área do participante | Hero com `fachada-etec.webp`, `seta-vermelha.png` e `seta-azul.png`; saudação “Bem-vindo(a)”. |
| Ícones | Lucide via `lucide-react`, no lugar dos SVGs manuais. |
| 404 de evento/certificado inexistente | Página 404 correta, sem shell de erro. |
| Revisão visual (Edge headless) | Home, agenda pública, login e as cinco telas de `/conta` em 1440, 1100 e 500 px, sem overflow horizontal. |

Os dados de teste foram removidos: `eventos`, `inscricoes`, `presencas`,
`certificados` e `participantes` estão em `0`; `administradores` tem `1`;
`auth.users` tem `1` (o admin real).

## Comportamento conhecido de 404

Com Cache Components/Partial Prefetching, páginas dinâmicas transmitem o shell
antes de a consulta terminar. Quando o registro não existe, o `notFound()` é
renderizado no corpo com a página 404 correta, mas o status HTTP já foi fixado em
`200` (soft 404). O Next.js injeta `noindex` nesse caso.

As páginas de detalhe de evento, de certificado e do admin usam `<Suspense>` para
que o 404 não substitua a resposta por um shell de erro. Um `404` HTTP real
continuaria exigindo validação no proxy ou a remoção do streaming.

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
   `NEXT_PUBLIC_SITE_URL` em Production/Preview.
3. Rode `npm run build` localmente antes do primeiro deploy.
4. Confirme no Supabase que a RLS está ativa e que as políticas públicas leem
   somente eventos publicados.
5. Cadastre ao menos um evento `publicado` (SQL Editor ou dashboard) para o
   portal não abrir vazio.

## Pendências

1. **Proteção de senha vazada** do Supabase Auth: ativar em Authentication →
   Password Security. Não é configurável pelas ferramentas usadas aqui.
2. **Cadastro/edição de eventos pelo painel**: hoje os eventos são criados pelo
   SQL Editor/dashboard. O painel admin gerencia inscrições, presença e
   certificados, mas ainda não tem formulário de evento.
3. **Deploy**: repositório ainda não commitado/publicado; a Vercel não foi
   configurada.
4. **Soft 404**: status HTTP `200` nas páginas dinâmicas inexistentes, conforme
   a seção acima.
5. **Eventos de exemplo**: o banco está vazio e o portal real abre no estado
   vazio.
6. **Storage de certificados**: hoje o certificado é renderizado em HTML para
   impressão; `arquivo_url` existe no schema, mas não há upload/geração de PDF.
7. **Testes automatizados**: a validação é manual (build, tipos, lint, smoke HTTP
   e screenshots). Não há suíte de testes unitários ou E2E no repositório.

## Documentação

- [Contrato do banco de dados](docs/banco-de-dados.md)
- [Segurança e RLS](docs/seguranca-rls.md)
