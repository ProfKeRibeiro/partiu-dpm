# Contrato do banco de dados

> **Status: confirmado e endurecido em 27/10/2026.**
>
> Migrações aplicadas:
>
> 1. `endurecer_seguranca_e_inscricoes`
> 2. `manter_updated_at`
> 3. `admin_presencas_certificados_e_link`
> 4. `atualizar_perfil_participante_rpc`
> 5. `indices_chaves_estrangeiras`
>
> Migração preparada, ainda pendente de aplicação no Supabase: `docs/migracoes/20261029_publico_alvo_eventos.sql`.
> Ela adiciona os públicos detalhados e aplica a elegibilidade no banco.
>
> O banco está **sem eventos cadastrados**: `eventos`, `participantes`,
> `inscricoes`, `presencas` e `certificados` têm 0 linhas. `administradores`
> tem 1 linha e `auth.users` tem 1 usuário (o admin real). Os dados temporários
> dos testes de integração foram removidos ao final.

## Resumo das tabelas

| Tabela | Linhas | RLS | Observação |
| --- | ---: | --- | --- |
| `public.eventos` | 0 | Ativa | Agenda, detalhes e contador `inscritos`. |
| `public.participantes` | 0 | Ativa | Perfil 1:1 com `auth.users`. |
| `public.inscricoes` | 0 | Ativa | Inscrição única por evento/participante. |
| `public.presencas` | 0 | Ativa | Uma presença por inscrição. |
| `public.certificados` | 0 | Ativa | Um certificado por inscrição. |
| `public.administradores` | 1 | Ativa | Fonte de verdade de `eh_admin()`. |

RLS ativa nas seis tabelas, sem `FORCE ROW LEVEL SECURITY`. O dono e
`service_role` continuam ignorando as políticas, como é padrão no Supabase.
Não há views nem materialized views no schema `public`.

## Schema real

### `public.eventos`

| Coluna | Tipo | Nulo | Default | Regra |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | PK |
| `titulo` | `text` | Não | — | — |
| `descricao` | `text` | Sim | — | — |
| `tipo` | `text` | Não | `'outro'` | `palestra`, `oficina`, `curso`, `feira`, `treinamento`, `outro` |
| `modalidade` | `text` | Não | `'presencial'` | `presencial`, `online`, `hibrido` |
| `local_evento` | `text` | Sim | — | — |
| `link_evento` | `text` | Sim | — | Link interno/transmissão; fora do acesso direto |
| `data_inicio` | `timestamptz` | Não | — | — |
| `data_fim` | `timestamptz` | Não | — | `data_fim >= data_inicio` |
| `inicio_inscricoes` | `timestamptz` | Sim | — | — |
| `fim_inscricoes` | `timestamptz` | Sim | — | `fim_inscricoes >= inicio_inscricoes` quando ambos existem |
| `limite_vagas` | `integer` | Sim | — | `NULL` ou `> 0` |
| `publico_alvo` | `text` | Não | `'comunidade_escolar'` | `alunos_escola`, `professores_funcionarios`, `comunidade_escolar`, `externo`, `todos` |
| `cursos_permitidos` | `text[]` | Não | `'{}'` | — |
| `series_permitidas` | `text[]` | Não | `'{}'` | — |
| `status` | `text` | Não | `'rascunho'` | `rascunho`, `publicado`, `cancelado`, `encerrado` |
| `imagem_url` | `text` | Sim | — | — |
| `cor_tema` | `text` | Não | `'azul-petroleo'` | Uma das 32 cores definidas em `docs/migracoes/20261029_cor-tema-evento.sql` |
| `criado_por` | `uuid` | Sim | — | FK `auth.users(id)` `ON DELETE SET NULL` |
| `created_at` | `timestamptz` | Não | `now()` | — |
| `updated_at` | `timestamptz` | Não | `now()` | Atualizado por trigger |
| `inscritos` | `integer` | Não | `0` | Contador de inscrições confirmadas; `>= 0` |

Restrições: `eventos_pkey` (PK `id`), `eventos_datas_validas`,
`eventos_limite_vagas_check`, `eventos_modalidade_check`,
`eventos_periodo_inscricao_valido`, `eventos_publico_alvo_check`,
`eventos_status_check`, `eventos_tipo_check`, `eventos_inscritos_check` e
`eventos_criado_por_fkey`.

Índices: `eventos_pkey` (único), `idx_eventos_status_data` em
`(status, data_inicio)` e `eventos_criado_por_idx` em `(criado_por)`.

O contador `inscritos` é mantido pelo trigger
`ao_atualizar_contagem_inscritos` e conta apenas linhas com
`status = 'confirmada'`. Ele existe para a interface não precisar de uma
consulta agregada por evento. A validação de vagas da RPC usa `count(*)`, que é
a fonte autoritativa.

**Não existe** coluna `slug` nem `vagas_preenchidas`.

### `public.participantes`

| Coluna | Tipo | Nulo | Default | Regra |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | — | PK; FK `auth.users(id)` `ON DELETE CASCADE` |
| `nome_completo` | `text` | Não | — | — |
| `curso` | `text` | Sim | — | — |
| `ano_serie` | `text` | Sim | — | — |
| `instituicao` | `text` | Sim | — | — |
| `categoria` | `text` | Não | `'aluno'` | `aluno`, `externo`, `servidor`, `outro` |
| `linkedin_url` | `text` | Sim | — | — |
| `created_at` | `timestamptz` | Não | `now()` | — |
| `updated_at` | `timestamptz` | Não | `now()` | Atualizado por trigger |

O perfil é criado automaticamente pelo trigger `ao_criar_usuario` em
`auth.users`. O e-mail fica em `auth.users`, não nesta tabela. A migração
`docs/migracoes/20261029_dados_cadastro_participante.sql` copia a categoria e o
curso validados enviados no cadastro para este perfil; aplique-a no SQL Editor
do Supabase para habilitar a persistência dos novos campos.

`authenticated` tem apenas `SELECT` nesta tabela. A edição do próprio perfil
passa pela RPC `atualizar_perfil_participante`, que nunca altera `categoria`,
`id`, `created_at` ou `updated_at`.

### `public.inscricoes`

| Coluna | Tipo | Nulo | Default | Regra |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | PK |
| `evento_id` | `uuid` | Não | — | FK `eventos(id)` `ON DELETE CASCADE` |
| `participante_id` | `uuid` | Não | — | FK `participantes(id)` `ON DELETE CASCADE` |
| `status` | `text` | Não | `'confirmada'` | `confirmada`, `cancelada`, `lista_espera` |
| `data_inscricao` | `timestamptz` | Não | `now()` | — |
| `observacoes` | `text` | Sim | — | — |
| `created_at` | `timestamptz` | Não | `now()` | — |

Restrições: PK `id`; único `inscricao_unica_por_evento`
`(evento_id, participante_id)`; checks de status; FKs com `CASCADE`.

Índices: `idx_inscricoes_evento_status` em `(evento_id, status)` e
`idx_inscricoes_participante` em `(participante_id)`.

**Escrita direta revogada.** `authenticated` tem apenas `SELECT` nesta tabela.
Inscrição, cancelamento e gestão administrativa passam pelas RPCs descritas
abaixo.

### `public.presencas`

| Coluna | Tipo | Nulo | Default | Regra |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | PK |
| `inscricao_id` | `uuid` | Não | — | Único; FK `inscricoes(id)` `ON DELETE CASCADE` |
| `presente` | `boolean` | Não | `false` | — |
| `data_registro` | `timestamptz` | Sim | — | Obrigatória quando `presente = true` |
| `registrado_por` | `uuid` | Sim | — | FK `auth.users(id)` `ON DELETE SET NULL` |
| `observacoes` | `text` | Sim | — | — |
| `created_at` | `timestamptz` | Não | `now()` | — |

Índices: `presencas_pkey`, `presenca_unica_por_inscricao` e
`presencas_registrado_por_idx` em `(registrado_por)`.

### `public.certificados`

| Coluna | Tipo | Nulo | Default | Regra |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | PK |
| `inscricao_id` | `uuid` | Não | — | Único; FK `inscricoes(id)` `ON DELETE CASCADE` |
| `codigo_validacao` | `uuid` | Não | `gen_random_uuid()` | Único |
| `arquivo_url` | `text` | Sim | — | — |
| `data_emissao` | `timestamptz` | Não | `now()` | — |
| `status` | `text` | Não | `'emitido'` | `emitido`, `cancelado` |
| `criado_por` | `uuid` | Sim | — | FK `auth.users(id)` `ON DELETE SET NULL` |
| `created_at` | `timestamptz` | Não | `now()` | — |

Índices: `certificados_pkey`, `certificado_unico_por_inscricao`,
`certificados_codigo_validacao_key`, `idx_certificados_codigo` e
`certificados_criado_por_idx` em `(criado_por)`.

### `public.administradores`

| Coluna | Tipo | Nulo | Default | Regra |
| --- | --- | --- | --- | --- |
| `usuario_id` | `uuid` | Não | — | PK; FK `auth.users(id)` `ON DELETE CASCADE` |
| `criado_em` | `timestamptz` | Não | `now()` | — |

Não existe coluna `ativo`. A presença na tabela é a única condição de admin.

## Funções, triggers e RPCs

### `public.eh_admin()`

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

- `SECURITY DEFINER` com `search_path = ''`.
- Retorna `false` quando `auth.uid()` é nulo.
- `EXECUTE` apenas para `authenticated`. `anon` não executa mais.

### `public.criar_perfil_participante()`

Trigger `ao_criar_usuario`, `AFTER INSERT ON auth.users`, por linha. Insere o
perfil em `participantes` a partir de `raw_user_meta_data` e do e-mail.
`SECURITY DEFINER` com `search_path = ''`. `EXECUTE` revogado de `public`,
`anon` e `authenticated`; o trigger continua funcionando (testado).

### `public.atualizar_contagem_inscritos()`

Trigger `ao_atualizar_contagem_inscritos`, `AFTER INSERT OR UPDATE OR DELETE ON
inscricoes`, por linha. Mantém `eventos.inscritos`:

- insere ou reativa `confirmada` → incrementa;
- cancela, remove ou troca de evento → decrementa;
- usa `greatest(inscritos - 1, 0)` para não ficar negativo.

`SECURITY DEFINER` com `search_path = ''`. `EXECUTE` revogado de `public`,
`anon` e `authenticated`.

### `public.definir_updated_at()`

Trigger `ao_atualizar_updated_at`, `BEFORE UPDATE` em `eventos` e
`participantes`. Define `updated_at = now()`. `SECURITY DEFINER` com
`search_path = ''`; `EXECUTE` revogado de `public`, `anon` e `authenticated`.

### `public.inscrever_em_evento(p_evento_id uuid)`

RPC transacional, `SECURITY DEFINER`, `search_path = ''`, retorna `jsonb`.
`EXECUTE` apenas para `authenticated`.

Regras:

1. Exige `auth.uid()` e perfil em `participantes`.
2. Bloqueia a linha do evento com `FOR UPDATE`, serializando inscrições do
   mesmo evento.
3. Exige `status = 'publicado'` e evento não encerrado.
4. Valida a janela de inscrições. Sem `fim_inscricoes`, o encerramento é
   `data_inicio`, igual à interface.
5. Valida `publico_alvo`, `cursos_permitidos` e `series_permitidas`.
   A migração `20261029_publico_alvo_eventos.sql` reforça o público com um
   trigger: aluno, servidor, comunidade escolar, público externo ou todos.
6. Rejeita duplicidade. Uma inscrição `cancelada` pode ser reativada.
7. Conta inscrições `confirmada` e compara com `limite_vagas`.
8. Insere ou reativa a inscrição, e o trigger atualiza `eventos.inscritos`.

Códigos de retorno:

| Código | Significado |
| --- | --- |
| `inscrito` | Inscrição criada/reativada com `ok: true`. |
| `nao_autenticado` | Sem `auth.uid()`. |
| `perfil_nao_encontrado` | Sem linha em `participantes`. |
| `evento_nao_encontrado` | UUID inexistente. |
| `evento_indisponivel` | Não está publicado. |
| `evento_encerrado` | `data_fim` já passou. |
| `inscricoes_em_breve` | Antes de `inicio_inscricoes`. |
| `inscricoes_encerradas` | Depois de `fim_inscricoes`/`data_inicio`. |
| `publico_incompativel` | Categoria não atende ao público-alvo. |
| `curso_incompativel` | Curso fora de `cursos_permitidos`. |
| `serie_incompativel` | Série fora de `series_permitidas`. |
| `duplicado` | Já existe inscrição confirmada. |
| `lista_espera` | Já existe inscrição em lista de espera. |
| `lotado` | `limite_vagas` atingido. |

Resposta de sucesso:

```json
{ "ok": true, "codigo": "inscrito", "inscricao_id": "uuid" }
```

Resposta de falha:

```json
{ "ok": false, "codigo": "lotado" }
```

### `public.cancelar_inscricao(p_inscricao_id uuid)`

RPC transacional, `SECURITY DEFINER`, `search_path = ''`, retorna `jsonb`.
`EXECUTE` apenas para `authenticated`.

- Bloqueia a inscrição com `FOR UPDATE`.
- Aceita o dono ou um admin (`eh_admin()`).
- Retorna `nao_encontrado` para inscrição de terceiros, sem vazar existência.
- Retorna `ja_cancelada` se já estiver cancelada.
- Impede cancelamento depois de `eventos.data_inicio`.
- Atualiza `status = 'cancelada'`; o trigger decrementa o contador.

Códigos: `cancelada`, `ja_cancelada`, `nao_autenticado`, `nao_encontrado`,
`cancelamento_encerrado`.

### `public.atualizar_perfil_participante(...)`

RPC `SECURITY DEFINER`, `search_path = ''`, retorna `jsonb`. `EXECUTE` apenas
para `authenticated`.

Assinatura:

```sql
atualizar_perfil_participante(
  p_nome_completo text,
  p_curso text default null,
  p_ano_serie text default null,
  p_instituicao text default null,
  p_linkedin_url text default null
)
```

- Faz `INSERT ... ON CONFLICT (id) DO UPDATE` para o próprio `auth.uid()`.
- Não altera `categoria`, `id`, `created_at` nem `updated_at`.
- Apara espaços e trata string vazia como `NULL`.
- Valida nome (3–120), curso (≤120), série (≤40), instituição (≤160) e
  LinkedIn (`https?://...`, ≤300).
- `anon` recebe `401 permission denied`.

Códigos: `atualizado`, `nao_autenticado`, `nome_invalido`, `curso_invalido`,
`serie_invalida`, `instituicao_invalida`, `linkedin_invalido`.

### `public.link_evento_do_inscrito(p_evento_id uuid)`

RPC `STABLE SECURITY DEFINER`, `search_path = ''`, retorna `text`.
`EXECUTE` apenas para `authenticated`.

- Devolve `NULL` sem sessão, para evento não publicado ou sem `link_evento`.
- Devolve o link apenas para admin ou para quem tem inscrição `confirmada` no
  evento.
- É o único caminho de leitura de `link_evento` pelo frontend.

### `public.admin_listar_inscricoes(p_evento_id uuid)`

RPC `STABLE SECURITY DEFINER`, `search_path = ''`, retorna `jsonb` (array).
`EXECUTE` apenas para `authenticated`; exige `eh_admin()`.

Cada item contém: `inscricao_id`, `participante_id`, `nome_completo`, `email`,
`categoria`, `curso`, `ano_serie`, `instituicao`, `status`, `data_inscricao`,
`presente`, `data_presenca`, `certificado_status`, `certificado_codigo` e
`certificado_data`.

Não-admin recebe `42501 nao_autorizado`.

### `public.admin_definir_presenca(p_inscricao_id uuid, p_presente boolean)`

RPC `SECURITY DEFINER`, exige `eh_admin()`. Bloqueia a inscrição com
`FOR UPDATE`, faz upsert em `presencas` e registra `data_registro`/`registrado_por`.

Códigos: `{ok:true,presente:boolean}`, `nao_encontrado`,
`inscricao_nao_confirmada` (ao marcar presença em inscrição não confirmada).
Não-admin: `42501 nao_autorizado`.

### `public.admin_emitir_certificado(p_inscricao_id uuid)`

RPC `SECURITY DEFINER`, exige `eh_admin()`.

- Exige inscrição `confirmada` e presença registrada.
- Se já existe certificado `emitido`, devolve `ja_emitido` com o mesmo código.
- Se existe certificado `cancelado`, reemite (`reemitido`).
- Caso contrário, cria (`emitido`).
- Retorna `codigo_validacao` em todos os casos de sucesso.

Códigos: `emitido`, `ja_emitido`, `reemitido`, `nao_encontrado`,
`inscricao_nao_confirmada`, `presenca_nao_registrada`.

### `public.admin_cancelar_certificado(p_inscricao_id uuid)`

RPC `SECURITY DEFINER`, exige `eh_admin()`. Marca `status = 'cancelado'`.
Códigos: `cancelado`, `nao_encontrado`.

### `public.admin_definir_status_inscricao(p_inscricao_id uuid, p_status text)`

RPC `SECURITY DEFINER`, exige `eh_admin()`. Aceita `confirmada`, `cancelada` ou
`lista_espera`; o trigger mantém `eventos.inscritos`.

Códigos: `atualizado`, `status_invalido`, `nao_encontrado`.

### `public.validar_certificado(p_codigo uuid)`

RPC `STABLE SECURITY DEFINER`, `search_path = ''`, retorna `jsonb`.
`EXECUTE` para `anon` e `authenticated` — é a única função pública.

- Filtra `certificados.status = 'emitido'`.
- Devolve `codigo_validacao`, `status`, `data_emissao`, `arquivo_url`,
  `participante`, `evento`, `evento_inicio`, `evento_fim`, `modalidade` e
  `local_evento`.
- Certificado inexistente ou cancelado devolve `NULL`.

## RLS e políticas atuais

| Tabela | Política | Comando | Papéis | Regra |
| --- | --- | --- | --- | --- |
| `administradores` | Consultar administradores autorizados | `SELECT` | `authenticated` | `usuario_id = auth.uid() OR eh_admin()` |
| `certificados` | Administradores gerenciam certificados | `ALL` | `authenticated` | `eh_admin()` |
| `certificados` | Consultar próprios certificados ou administrar | `SELECT` | `authenticated` | dono da inscrição `OR eh_admin()` |
| `eventos` | Administradores gerenciam eventos | `ALL` | `authenticated` | `eh_admin()` |
| `eventos` | Eventos publicados são públicos | `SELECT` | `anon` | `status = 'publicado'` |
| `eventos` | Eventos publicados ou admin | `SELECT` | `authenticated` | `status = 'publicado' OR eh_admin()` |
| `inscricoes` | Consultar próprias inscrições ou administrar | `SELECT` | `authenticated` | `participante_id = auth.uid() OR eh_admin()` |
| `participantes` | Atualizar próprio perfil ou administrar | `UPDATE` | `authenticated` | `id = auth.uid() OR eh_admin()` |
| `participantes` | Consultar próprio perfil ou administrar | `SELECT` | `authenticated` | `id = auth.uid() OR eh_admin()` |
| `participantes` | Criar próprio perfil | `INSERT` | `authenticated` | `id = auth.uid()` (sem grant direto; trigger é o caminho) |
| `presencas` | Administradores gerenciam presenças | `ALL` | `authenticated` | `eh_admin()` |
| `presencas` | Consultar própria presença ou administrar | `SELECT` | `authenticated` | dono da inscrição `OR eh_admin()` |

As políticas de `INSERT` e `UPDATE` de `inscricoes` foram removidas. Não há
política de `DELETE` para usuários comuns. `administradores` não tem política de
escrita.

## Privilégios

### Tabelas

| Tabela | `anon` | `authenticated` |
| --- | --- | --- |
| `eventos` | `SELECT` em 17 colunas públicas | `SELECT` por coluna (sem `link_evento`) + `INSERT`, `UPDATE`, `DELETE` (admin via RLS) |
| `participantes` | Nenhum | `SELECT` apenas (edição via RPC) |
| `inscricoes` | Nenhum | `SELECT` apenas |
| `presencas` | Nenhum | `SELECT`, `INSERT`, `UPDATE`, `DELETE` (admin via RLS) |
| `certificados` | Nenhum | `SELECT`, `INSERT`, `UPDATE`, `DELETE` (admin via RLS) |
| `administradores` | Nenhum | `SELECT` |

`anon` recebe `SELECT` apenas nestas colunas de `eventos`:

```text
id, titulo, descricao, tipo, modalidade, local_evento,
data_inicio, data_fim, inicio_inscricoes, fim_inscricoes,
limite_vagas, publico_alvo, cursos_permitidos, series_permitidas,
status, imagem_url, cor_tema, inscritos
```

`authenticated` recebe `SELECT` em todas as colunas de `eventos`, **exceto**
`link_evento`. `criado_por`, `created_at` e `updated_at` estão incluídos.

`link_evento` fica fora dos dois grants. Por isso, `SELECT *` com a chave
`anon` falha com `permission denied`, e o link só é obtido pela RPC
`link_evento_do_inscrito`.

`TRUNCATE`, `REFERENCES` e `TRIGGER` foram revogados de `anon` e
`authenticated` nas seis tabelas.

### Funções

| Função | `anon` | `authenticated` |
| --- | --- | --- |
| `eh_admin()` | Não | Sim |
| `criar_perfil_participante()` | Não | Não |
| `atualizar_contagem_inscritos()` | Não | Não |
| `definir_updated_at()` | Não | Não |
| `inscrever_em_evento(uuid)` | Não | Sim |
| `cancelar_inscricao(uuid)` | Não | Sim |
| `atualizar_perfil_participante(...)` | Não | Sim |
| `link_evento_do_inscrito(uuid)` | Não | Sim |
| `admin_listar_inscricoes(uuid)` | Não | Sim (exige `eh_admin()`) |
| `admin_definir_presenca(uuid, boolean)` | Não | Sim (exige `eh_admin()`) |
| `admin_emitir_certificado(uuid)` | Não | Sim (exige `eh_admin()`) |
| `admin_cancelar_certificado(uuid)` | Não | Sim (exige `eh_admin()`) |
| `admin_definir_status_inscricao(uuid, text)` | Não | Sim (exige `eh_admin()`) |
| `validar_certificado(uuid)` | Sim | Sim |

## Impacto no frontend

O mapeador (`src/lib/eventos.ts`) está alinhado ao schema:

| Campo do app | Coluna real | Situação |
| --- | --- | --- |
| `id` | `id` | OK |
| `titulo` | `titulo` | OK |
| `descricao` | `descricao` | OK |
| `tipo` | `tipo` | OK |
| `modalidade` | `modalidade` | OK (`hibrido` é normalizado para `hibrida`) |
| `local` | `local_evento` | OK |
| `linkAcesso` | `link_evento` | Só via `link_evento_do_inscrito` |
| `inicio` / `fim` | `data_inicio` / `data_fim` | OK |
| `inscricoesInicio` / `inscricoesFim` | `inicio_inscricoes` / `fim_inscricoes` | OK |
| `limiteVagas` | `limite_vagas` | OK |
| `inscritos` | `inscritos` | OK, mantido por trigger |
| `publicoAlvo` | `publico_alvo` | OK |
| `cursosPermitidos` | `cursos_permitidos` | OK (`text[]`) |
| `seriesPermitidas` | `series_permitidas` | OK (`text[]`) |
| `status` | `status` | OK |
| `imagemUrl` | `imagem_url` | OK |
| `corTema` | `cor_tema` | OK; aplica a paleta da página pública |
| `slug` | não existe | Rota por UUID está correta |

A lista pública usada pelo frontend é:

```text
id, titulo, descricao, tipo, modalidade, local_evento,
data_inicio, data_fim, inicio_inscricoes, fim_inscricoes,
limite_vagas, publico_alvo, cursos_permitidos, series_permitidas,
status, imagem_url, cor_tema, inscritos
```

## Validação executada

Testes reais em 27/10/2026, com build de produção e dados temporários removidos
ao final:

| Teste | Resultado |
| --- | --- |
| Trigger de perfil ao inserir em `auth.users` | Perfil criado |
| `inscrever_em_evento` | `inscrito` |
| Contador após inscrição | 1 |
| Segunda inscrição do mesmo usuário | `duplicado` |
| Segundo usuário com 1 vaga ocupada | `lotado` |
| Cancelamento pelo dono | `cancelada` |
| Contador após cancelamento | 0 |
| Segundo usuário após liberar vaga | `inscrito` |
| `updated_at` após update de perfil | Atualizado pelo trigger |
| `anon` lendo `titulo,inscritos` via REST | 200 |
| `anon` lendo `link_evento` via REST | 401 `permission denied` |
| `authenticated` lendo `link_evento` via tabela | Negado |
| `link_evento_do_inscrito` para inscrito | Link retornado |
| `link_evento_do_inscrito` para não inscrito | `NULL` |
| `anon` usando `select=*` | 401 `permission denied` |
| Inserção direta em `inscricoes` por `authenticated` | Sem grant |
| `atualizar_perfil_participante` | `atualizado`, trims e validações |
| `atualizar_perfil_participante` como `anon` | 401 `permission denied` |
| `admin_listar_inscricoes` como não-admin | 403 `nao_autorizado` |
| `admin_definir_presenca` | `{ok:true,presente:true}` |
| `admin_emitir_certificado` | `codigo_validacao` público válido |
| `validar_certificado` público | Dados do certificado |
| Evento temporário em `/`, `/eventos` e detalhe | OK |
| Página 404 de evento/certificado inexistente | 404 visual, sem shell de erro |

## Advisors do Supabase

Situação após as migrações:

| Nível | Item | Situação |
| --- | --- | --- |
| WARN | `anon` executa 1 função `SECURITY DEFINER` | `validar_certificado`, intencional e de leitura pública. |
| WARN | `authenticated` executa 11 funções `SECURITY DEFINER` | Intencional; são funções de negócio que fixam `search_path` e validam o chamador/`eh_admin()`. |
| WARN | Proteção de senha vazada desativada | Ativar em Auth → Password Security. |
| WARN | Políticas permissivas múltiplas em `eventos`, `certificados` e `presencas` | As políticas `ALL` de admin coexistem com as de leitura; performance, não falha. |
| INFO | FKs sem índice | Resolvido: `certificados_criado_por_idx`, `eventos_criado_por_idx` e `presencas_registrado_por_idx`. |

## Consultas de inspeção (reprodução)

### Migrações aplicadas

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

### Colunas

```sql
select table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('eventos','participantes','inscricoes',
                     'presencas','certificados','administradores')
order by table_name, ordinal_position;
```

### Restrições e índices

```sql
select conrelid::regclass as tabela, conname as restricao,
       contype as tipo, pg_get_constraintdef(oid) as definicao
from pg_constraint
where connamespace = 'public'::regnamespace
order by conrelid::regclass::text, conname;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```

### RLS e políticas

```sql
select c.relname as tabela,
       c.relrowsecurity as rls_habilitada,
       c.relforcerowsecurity as rls_forcada
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

select tablename, policyname, permissive, roles, cmd,
       qual as usando, with_check as com_verificacao
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

### Funções e triggers

```sql
select p.proname as funcao,
       pg_get_function_identity_arguments(p.oid) as argumentos,
       p.prosecdef as security_definer,
       p.proconfig as configuracoes,
       pg_get_functiondef(p.oid) as definicao
from pg_proc p
where p.pronamespace = 'public'::regnamespace
order by p.proname;

select n.nspname as schema, c.relname as tabela, t.tgname as trigger,
       pg_get_triggerdef(t.oid) as definicao
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and n.nspname in ('public','auth')
order by n.nspname, c.relname, t.tgname;
```

### Privilégios

```sql
select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public' and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;

select table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type, column_name;

select p.proname, p.proacl
from pg_proc p
where p.pronamespace = 'public'::regnamespace
order by p.proname;
```

### Volumetria

```sql
select
  (select count(*) from public.eventos) as eventos,
  (select count(*) from public.eventos where status = 'publicado') as publicados,
  (select count(*) from public.inscricoes) as inscricoes,
  (select count(*) from public.participantes) as participantes,
  (select count(*) from public.certificados) as certificados,
  (select count(*) from public.administradores) as administradores;
```

## Pendências conhecidas

1. **Cadastro/edição de eventos**: o painel admin gerencia inscrições, presença
   e certificados, mas ainda não tem formulário para criar/editar eventos. Hoje
   o cadastro é feito no SQL Editor/dashboard.
2. **Proteção de senha vazada** do Supabase Auth está desativada (passo manual
   no dashboard).
3. **Deploy**: repositório não commitado/publicado; Vercel não configurada.
4. **Soft 404**: páginas dinâmicas inexistentes retornam HTTP 200 com a UI de
   404 (limitação do streaming com Cache Components).
5. **Certificado em arquivo**: `arquivo_url` existe, mas não há geração/upload
   de PDF; a versão atual é HTML para impressão.
