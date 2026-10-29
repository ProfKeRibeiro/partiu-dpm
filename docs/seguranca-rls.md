# Segurança e RLS

> **Status: endurecido em 27/10/2026.**
>
> Cinco migrações foram aplicadas via MCP do Supabase:
>
> 1. `endurecer_seguranca_e_inscricoes`
> 2. `manter_updated_at`
> 3. `admin_presencas_certificados_e_link`
> 4. `atualizar_perfil_participante_rpc`
> 5. `indices_chaves_estrangeiras`
>
> Elas resolveram a exposição de `link_evento`, a escrita direta em
> `inscricoes`, os grants amplos, a ausência de trigger de `updated_at` e a
> falta de RPCs administrativas. Este documento registra o estado real, o que
> mudou, o que continua pendente e o checklist para as próximas etapas.

O schema detalhado está em [`banco-de-dados.md`](banco-de-dados.md).

## Princípios

1. **A RLS é a autoridade.** Esconder um botão ou filtrar no cliente não é
   segurança. Toda leitura e escrita precisa ser permitida (ou negada) pelo
   banco.
2. **A chave pública é pública.** Qualquer pessoa pode extraí-la do bundle. A
   proteção vem das políticas e dos grants, não do segredo da chave.
3. **`service_role` nunca vai para o frontend.** Ela ignora a RLS. Se um dia for
   necessária no servidor, deve ficar em variável sem `NEXT_PUBLIC_` e ser usada
   apenas em rotinas administrativas explícitas.
4. **Autorização administrativa usa `public.eh_admin()`**, que consulta
   `public.administradores`. Não confie em `user_metadata` (editável pelo
   usuário) para decidir quem é admin.
5. **Validação de negócio é transacional no banco.** Vagas, prazo e duplicidade
   não podem depender de uma checagem prévia no navegador.
6. **O proxy renova sessão e barra rotas sem sessão; a autorização continua no
   servidor/banco.** `src/proxy.ts` mantém os cookies atualizados e redireciona
   `/conta` e `/admin` para `/entrar?next=...` quando não há sessão. Ele não
   decide quem é admin.

## O que está implementado no frontend

- Cliente público (`src/lib/supabase/public.ts`): chave pública, sem cookies,
  sem sessão, apenas para leitura de eventos.
- Consulta pública filtra `status = 'publicado'`, limita a 100 registros e pede
  uma **lista explícita de colunas** (`CAMPOS_EVENTO_PUBLICO`), compatível com o
  grant por coluna.
- Detalhe valida UUID e exige novamente `status = 'publicado'`.
- Cliente de servidor com cookies (`src/lib/supabase/server.ts`) para sessão,
  inscrições, perfil e admin.
- Proxy renova a sessão com `getClaims()` e falha de forma silenciosa para não
  derrubar páginas públicas.
- Guarda de presença de sessão no proxy para `/conta` e `/admin`.
- `AcessoRestrito` e `SessaoAtiva` renderizam estados explícitos em vez de
  chamar `redirect()` durante o render (que, com Cache Components, substituiria
  a resposta por um shell de erro).
- Server Actions validam sessão e admin no servidor antes de chamar as RPCs;
  `redirect()` é usado apenas dentro de actions.
- `.env.local` ignorado pelo Git; `service_role` não é usada.
- Cabeçalhos de segurança básicos em `next.config.ts`.

## Estado real após as migrações

### RLS e políticas

RLS ativa nas seis tabelas. Nenhuma tabela está com `FORCE ROW LEVEL SECURITY`;
o dono e `service_role` ignoram as políticas, como é padrão no Supabase.

| Tabela | Políticas após as migrações |
| --- | --- |
| `eventos` | `SELECT` para `anon` (`status = 'publicado'`) e `SELECT` para `authenticated` (`status = 'publicado' OR eh_admin()`); `ALL` para admin (`authenticated`). |
| `participantes` | `SELECT` e `UPDATE` do próprio perfil ou admin; `INSERT` do próprio perfil (sem grant direto; o trigger é o caminho). |
| `inscricoes` | Apenas `SELECT` das próprias ou admin. `INSERT`/`UPDATE` de usuário comum foram removidos. |
| `presencas` | `SELECT` da própria ou admin; `ALL` para admin. |
| `certificados` | `SELECT` do próprio ou admin; `ALL` para admin. |
| `administradores` | `SELECT` da própria linha ou admin. Sem política de escrita. |

As regras completas, com `using` e `with_check`, estão no documento de schema.

### Funções

| Função | Tipo | `anon` | `authenticated` |
| --- | --- | --- | --- |
| `eh_admin()` | `STABLE SECURITY DEFINER`, `search_path = ''` | Não executa | Executa |
| `criar_perfil_participante()` | `SECURITY DEFINER`, trigger | Não executa | Não executa |
| `atualizar_contagem_inscritos()` | `SECURITY DEFINER`, trigger | Não executa | Não executa |
| `definir_updated_at()` | `SECURITY DEFINER`, trigger | Não executa | Não executa |
| `inscrever_em_evento(uuid)` | RPC transacional | Não executa | Executa |
| `cancelar_inscricao(uuid)` | RPC transacional | Não executa | Executa |
| `atualizar_perfil_participante(...)` | RPC de perfil | Não executa | Executa |
| `link_evento_do_inscrito(uuid)` | RPC de leitura restrita | Não executa | Executa (inscrito/admin) |
| `admin_listar_inscricoes(uuid)` | RPC admin | Não executa | Executa (exige `eh_admin()`) |
| `admin_definir_presenca(uuid, boolean)` | RPC admin | Não executa | Executa (exige `eh_admin()`) |
| `admin_emitir_certificado(uuid)` | RPC admin | Não executa | Executa (exige `eh_admin()`) |
| `admin_cancelar_certificado(uuid)` | RPC admin | Não executa | Executa (exige `eh_admin()`) |
| `admin_definir_status_inscricao(uuid, text)` | RPC admin | Não executa | Executa (exige `eh_admin()`) |
| `validar_certificado(uuid)` | RPC pública de leitura | Executa | Executa |

Triggers ativos:

- `ao_criar_usuario` em `auth.users` → cria o perfil em `participantes`.
- `ao_atualizar_contagem_inscritos` em `inscricoes` → mantém
  `eventos.inscritos`.
- `ao_atualizar_updated_at` em `eventos` e `participantes` → define
  `updated_at = now()`.

### Grants

| Tabela | `anon` | `authenticated` |
| --- | --- | --- |
| `eventos` | `SELECT` em colunas públicas | `SELECT` por coluna (sem `link_evento`) + `INSERT`, `UPDATE`, `DELETE` (protegidos por RLS/admin) |
| `participantes` | Nenhum | `SELECT` apenas (edição via RPC) |
| `inscricoes` | Nenhum | `SELECT` apenas |
| `presencas` | Nenhum | `SELECT`, `INSERT`, `UPDATE`, `DELETE` (admin via RLS) |
| `certificados` | Nenhum | `SELECT`, `INSERT`, `UPDATE`, `DELETE` (admin via RLS) |
| `administradores` | Nenhum | `SELECT` |

Colunas de `eventos` legíveis por `anon`:

```text
id, titulo, descricao, tipo, modalidade, local_evento,
data_inicio, data_fim, inicio_inscricoes, fim_inscricoes,
limite_vagas, publico_alvo, cursos_permitidos, series_permitidas,
status, imagem_url, cor_tema, inscritos
```

`authenticated` lê todas as colunas de `eventos`, **exceto** `link_evento`.
`SELECT *` com a chave pública falha com `permission denied` — comportamento
desejado. O link só é devolvido por `link_evento_do_inscrito`.

`authenticated` não tem `UPDATE` direto em `participantes`; a edição passa por
`atualizar_perfil_participante`, que não altera `categoria`, `id`,
`created_at` nem `updated_at` (o trigger ajusta a data). `TRUNCATE`,
`REFERENCES` e `TRIGGER` foram revogados de `anon` e `authenticated` nas seis
tabelas.

## Achados: o que foi resolvido

### 1. `eventos.link_evento` exposto ao `anon` — resolvido

**Antes:** `anon` tinha `SELECT` na tabela inteira e conseguia ler
`link_evento` via API.

**Depois:** `SELECT` de tabela foi revogado de `anon` e substituído por grant
coluna a coluna sem `link_evento`. O frontend migrou de `select("*")` para a
lista explícita.

**Teste real:** `eventos?select=titulo,inscritos` → `200`;
`eventos?select=*` e `eventos?select=link_evento` → `401 permission denied`.

**Risco residual do link:** resolvido em duas camadas. `authenticated` também
não tem `SELECT` em `link_evento`; a leitura passa pela RPC
`link_evento_do_inscrito(uuid)`, que devolve o link apenas para admin ou para
quem tem inscrição `confirmada`. Testado: inscrito recebe o link, não inscrito
recebe `NULL`, `anon` não executa a função.

### 2. Inscrição direta permitia furar vagas e regras — resolvido

**Antes:** a política `Criar própria inscrição` só exigia
`participante_id = auth.uid() AND status = 'confirmada'`. Não validava prazo,
público-alvo, vagas ou se o evento estava publicado. O `UPDATE` permitia trocar
`evento_id` e `status` livremente.

**Depois:**

- `INSERT`/`UPDATE`/`DELETE` diretos em `inscricoes` foram revogados de
  `authenticated`; as políticas correspondentes foram removidas.
- A escrita passa por `inscrever_em_evento(uuid)` e `cancelar_inscricao(uuid)`.
- A RPC de inscrição bloqueia a linha do evento com `FOR UPDATE`, valida status,
  janela, público, curso, série, duplicidade e vagas, e insere/reativa de forma
  transacional.
- O cancelamento bloqueia a inscrição, aceita apenas o dono ou admin e impede
  cancelar depois de `data_inicio`.

**Testes reais** (build de produção, dois usuários temporários e evento com 1
vaga):

| Passo | Resultado |
| --- | --- |
| Usuário 1 inscreve | `inscrito` |
| Contador `eventos.inscritos` | `1` |
| Usuário 1 repete | `duplicado` |
| Usuário 2 com vaga ocupada | `lotado` |
| Usuário 1 cancela | `cancelada` |
| Contador após cancelar | `0` |
| Usuário 2 após liberar vaga | `inscrito` |
| Contador final | `1` |

### 3. `participantes` sem grants de escrita — resolvido por RPC

**Antes:** `authenticated` precisava de `UPDATE` direto em colunas de perfil.

**Depois:** `authenticated` tem apenas `SELECT` em `participantes`. A edição é
feita por `atualizar_perfil_participante(...)`, que:

- faz upsert apenas para `auth.uid()`;
- apara espaços e valida nome, curso, série, instituição e LinkedIn;
- nunca altera `categoria`, `id`, `created_at` ou `updated_at`;
- é `SECURITY DEFINER` com `search_path = ''`;
- não é executável por `anon` (`401 permission denied`).

**Teste real:** perfil atualizado (`atualizado`), nome curto rejeitado
(`nome_invalido`), LinkedIn sem esquema rejeitado (`linkedin_invalido`),
`categoria` preservada mesmo após tentativa de alteração, e `anon` bloqueado.

### 4. `eh_admin()` executável por `anon` — resolvido

A política pública foi separada por papel:

```sql
create policy "Eventos publicados são públicos"
on public.eventos for select
to anon
using (status = 'publicado');

create policy "Eventos publicados ou admin"
on public.eventos for select
to authenticated
using (status = 'publicado' or public.eh_admin());
```

Com isso, `EXECUTE` de `eh_admin()` pôde ser revogado de `anon` sem quebrar a
leitura pública.

### 5. Grants amplos em tabelas sensíveis — resolvido

`anon` perdeu todo o acesso de tabela nas seis tabelas; mantém apenas o `SELECT`
por coluna em `eventos`. `authenticated` perdeu escrita direta em `inscricoes`,
escrita direta em `participantes` e a leitura de `link_evento`.

### 6. `updated_at` sem trigger — resolvido

`definir_updated_at()` e o trigger `ao_atualizar_updated_at` foram criados em
`eventos` e `participantes`. `EXECUTE` da função foi revogado de todos os papéis
de API. Teste real: um `UPDATE` de perfil sob o papel `authenticated` atualizou
`nome_completo` e renovou `updated_at`.

### 7. Falta de RPCs administrativas — resolvido

Foram criadas RPCs `SECURITY DEFINER` que começam com `if not public.eh_admin()
then raise exception 'nao_autorizado' using errcode = '42501'`. Elas cobrem:

- listagem de inscrições com e-mail, perfil, presença e certificado;
- marcar/desmarcar presença;
- emitir, reemitir e cancelar certificado;
- alterar status da inscrição (`confirmada`, `cancelada`, `lista_espera`).

**Teste real:** usuário comum recebeu `403 nao_autorizado` em
`admin_listar_inscricoes`; admin marcou presença (`{ok:true,presente:true}`),
emitiu certificado e o código validou publicamente.

### 8. `link_evento` restrito a inscritos — resolvido

`link_evento_do_inscrito(uuid)` devolve o link apenas quando:

- há sessão;
- o evento está publicado; e
- o chamador é admin ou tem inscrição `confirmada`.

Caso contrário, devolve `NULL`. O frontend só mostra “Acessar link do evento”
quando a RPC retorna valor.

### 9. FKs sem índice — resolvido

Índices criados em `certificados.criado_por`, `eventos.criado_por` e
`presencas.registrado_por`.

### 10. Banco sem eventos (operacional) — permanece

As tabelas de eventos e inscrições continuam vazias. O portal real abre com o
estado vazio até o primeiro evento publicado. Não é falha de segurança, mas
afeta a percepção de “site quebrado” em demonstrações.

## Advisors do Supabase

Consulta após as migrações, em 27/10/2026:

| Nível | Item | Situação |
| --- | --- | --- |
| WARN | `anon` executa 1 função `SECURITY DEFINER` | `validar_certificado(uuid)`, intencional: leitura pública e sem escrita. |
| WARN | `authenticated` executa 11 funções `SECURITY DEFINER` | **Intencional.** Funções de negócio; fixam `search_path` e validam o chamador/`eh_admin()`. |
| WARN | Proteção de senha vazada desativada | **Pendente:** ativar em Auth → Password Security. |
| WARN | Políticas permissivas múltiplas em `eventos`, `certificados` e `presencas` | Apenas performance; as policies `ALL` de admin coexistem com as de leitura. |
| INFO | FKs sem índice | **Resolvido** pelos três índices criados. |
| INFO | Índices não usados em `inscricoes` e `certificados` | Esperado: tabelas vazias. Reavaliar com dados. |

As políticas permissivas múltiplas não são falha de segurança: são combinadas
com `OR`, mas cada uma é avaliada. Podem ser unificadas em uma única policy por
tabela/ação se o custo aparecer.

## Modelo de RLS em vigor

O princípio: `anon` lê somente conteúdo publicado; `authenticated` lê os próprios
dados; admin lê tudo via `eh_admin()`; escrita de negócio passa por RPC.

### `eventos`

| Operação | `anon` | `authenticated` | Admin |
| --- | --- | --- | --- |
| `select` | Somente `status = 'publicado'`, 17 colunas públicas | Publicado ou admin, sem `link_evento` | Tudo |
| `insert` / `update` / `delete` | Não | Não (só admin via RLS) | Sim |

### `participantes`

| Operação | `anon` | `authenticated` | Admin |
| --- | --- | --- | --- |
| `select` | Não | Apenas o próprio | Tudo |
| `update` | Não | Via RPC `atualizar_perfil_participante` | Via RLS |
| `insert` | Não | Via trigger `ao_criar_usuario` | Via RLS |
| `delete` | Não | Não | Via RLS |

### `inscricoes`

| Operação | `anon` | `authenticated` | Admin |
| --- | --- | --- | --- |
| `select` | Não | Apenas as próprias | Tudo |
| `insert` | Não | Via RPC `inscrever_em_evento` | Via `admin_definir_status_inscricao`/RPCs |
| `update` | Não | Via RPC `cancelar_inscricao` | Via `admin_definir_status_inscricao` |
| `delete` | Não | Não | Via cascata/política admin |

### `presencas`

| Operação | `anon` | `authenticated` | Admin |
| --- | --- | --- | --- |
| `select` | Não | Apenas as próprias | Tudo |
| `insert` / `update` / `delete` | Não | Não | Via RPC `admin_definir_presenca` / RLS |

### `certificados`

| Operação | `anon` | `authenticated` | Admin |
| --- | --- | --- | --- |
| `select` | Não | Apenas os próprios | Tudo |
| `insert` / `update` / `delete` | Não | Não | Via RPCs admin / RLS |

A validação pública de certificado não lê a tabela: usa
`validar_certificado(codigo)`, que devolve apenas nome, evento, data,
modalidade e local, e somente para certificados `emitido`.

### `administradores`

| Operação | `anon` | `authenticated` | Admin |
| --- | --- | --- | --- |
| `select` | Não | No máximo a própria linha | Tudo |
| `insert` / `update` / `delete` | Não | Não | Com cautela |

Nunca use `using (true)`. Nunca permita que um usuário se insira ou altere o
próprio registro nessa tabela. O estado atual já segue essa regra: apenas
`service_role` escreve.

## `eh_admin()`: estado e requisitos

A implementação atual está adequada:

```sql
CREATE OR REPLACE FUNCTION public.eh_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.administradores a
        WHERE a.usuario_id = (SELECT auth.uid())
    );
$function$
```

Não existe coluna `ativo`; a presença na tabela é a única condição. Se o produto
passar a precisar desativar admins sem removê-los, adicionar a coluna e incluir a
condição na função.

Requisitos que devem ser mantidos:

- `STABLE` e `SECURITY DEFINER`.
- `search_path` fixo e vazio (`''`) ou restrito a `public, pg_temp`.
- `false` quando `auth.uid()` é nulo.
- `EXECUTE` apenas para os papéis que realmente precisam.
- Nenhuma dependência de schema controlado pelo usuário.

## Integridade de inscrições

Fluxo em vigor:

1. Usuário autenticado chama
   `public.inscrever_em_evento(p_evento_id uuid)`.
2. A função `SECURITY DEFINER` com `search_path` fixo:
   - verifica `auth.uid()` e o perfil em `participantes`;
   - bloqueia a linha do evento com `select ... for update`;
   - confirma `status = 'publicado'`, `data_fim`, janela de inscrições,
     público-alvo, cursos e séries;
   - rejeita duplicidade e lista de espera;
   - conta inscrições com `status = 'confirmada'` e compara com `limite_vagas`;
   - insere ou reativa a inscrição; o trigger atualiza `eventos.inscritos`;
   - retorna um código de domínio (`inscrito`, `lotado`, `duplicado`,
     `inscricoes_encerradas`, `publico_incompativel`, ...).
3. `INSERT` e `UPDATE` diretos em `inscricoes` estão revogados de
   `authenticated`; a RPC é o único caminho de escrita.
4. O cancelamento usa `cancelar_inscricao(uuid)`, com validação de prazo e
   transição de status.

O bloqueio `FOR UPDATE` evita que duas requisições simultâneas passem pela
contagem e estourem as vagas.

## Painel administrativo e Server Actions

- O proxy barra `/admin` sem sessão (`307`). A página verifica
  `usuarioEhAdmin()`; quem está logado mas não é admin vê `AcessoRestrito`, sem
  nenhum dado.
- As Server Actions chamam `garantirAdmin()` antes de qualquer RPC e usam
  `redirect()` apenas dentro da action (permitido).
- As RPCs repetem a checagem com `eh_admin()` e lançam `42501` para não-admin.
  Assim, uma chamada direta à API não depende da interface.
- A página `/admin/eventos/[id]` fica dentro de `<Suspense>`; um evento
  inexistente renderiza a página 404 correta, sem shell de erro.
- `link_evento` não aparece na listagem administrativa nem na consulta de
  eventos; ele é obtido sob demanda pela RPC do inscrito.

## Testes negativos executados

Com a chave pública, via REST, e com usuários temporários:

- [x] `select` em `eventos` não retorna rascunhos, cancelados ou encerrados.
- [x] `select` em `eventos` não expõe `link_evento` para `anon`
      (`401 permission denied`).
- [x] `select=*` com `anon` falha (`401 permission denied`).
- [x] `authenticated` também não lê `link_evento` via tabela.
- [x] `link_evento_do_inscrito` devolve `NULL` para não inscrito.
- [x] `anon` não tem acesso de tabela a `inscricoes`, `participantes`,
      `presencas`, `certificados` nem `administradores`.
- [x] Usuário comum não tem `INSERT`/`UPDATE`/`DELETE` em `inscricoes`.
- [x] Usuário comum não atualiza `participantes` diretamente.
- [x] `atualizar_perfil_participante` não altera `categoria` e bloqueia `anon`.
- [x] `eh_admin()` não é executável por `anon`.
- [x] `criar_perfil_participante()` não é executável por `anon` nem
      `authenticated`.
- [x] `admin_listar_inscricoes` como não-admin retorna `403 nao_autorizado`.
- [x] Inscrição duplicada retorna `duplicado`.
- [x] Inscrição com vagas esgotadas retorna `lotado`.
- [x] Cancelamento libera a vaga e o contador volta a `0`.
- [x] Admin marca presença e emite certificado.
- [x] Certificado emitido valida publicamente; inexistente/cancelado não.
- [x] Evento temporário apareceu em `/`, `/eventos` e no detalhe, sem vazar
      `link_evento`.
- [x] `/admin` como usuário comum não vaza nomes, e-mails ou inscrições.
- [x] `/conta` e `/admin` sem sessão redirecionam para `/entrar?next=...`.

O teste com admin real foi executado com um usuário temporário incluído em
`administradores`, removido ao final. A tabela voltou a ter apenas o admin
original.

## Checklist de revisão

Já confirmado:

- [x] RLS habilitada nas seis tabelas.
- [x] Políticas e grants documentados após as migrações.
- [x] `eh_admin()` e as funções de trigger revisadas e com `EXECUTE` mínimo.
- [x] `anon` lê apenas eventos publicados, e só colunas públicas.
- [x] `link_evento` inacessível para `anon` e `authenticated` via tabela.
- [x] `administradores` não tem política de escrita para usuários comuns.
- [x] `UNIQUE (evento_id, participante_id)` existe em `inscricoes`.
- [x] RPCs transacionais de inscrição e cancelamento implantadas.
- [x] Escrita direta em `inscricoes` revogada.
- [x] Edição de perfil via RPC, sem grant direto em `participantes`.
- [x] `updated_at` mantido por trigger.
- [x] RPCs administrativas com `eh_admin()` e testes negativos.
- [x] Guarda de sessão no proxy + estados de acesso restrito no servidor.
- [x] Testes negativos principais executados.
- [x] Dados de teste removidos.

Pendente:

- [ ] Ativar proteção de senha vazada no Supabase Auth.
- [ ] Cadastro/edição de eventos pelo painel (hoje via SQL/dashboard).
- [ ] Publicar o repositório e configurar a Vercel.
- [ ] Revisar Storage, caso os certificados passem a ser PDFs.
- [ ] Repetir a revisão antes de cada etapa que ampliar permissões.

As consultas usadas na inspeção estão em
[`banco-de-dados.md`](banco-de-dados.md).
