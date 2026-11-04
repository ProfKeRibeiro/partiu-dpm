# Consentimentos e LGPD

Estado em 03/11/2026: **infraestrutura de banco, Server Actions e página de
resposta do responsável**. O formulário de cadastro ainda não foi alterado; o
ponto de integração está descrito abaixo.

## Versão dos termos

`src/lib/consentimentos/termos.ts` exporta `VERSAO_TERMOS = "03/11/2026"`, a
mesma data exibida em `/termos` e `/privacidade` (“3 de novembro de 2026”).
Use sempre essa constante ao registrar aceite ou criar consentimento.

## Tabela `public.consentimentos`

Campos: `tipo` (`termos_uso`, `comunicacoes`, `menor_responsavel`, `sorteio`),
`versao_termo`, `usuario_id`, `visitante_id` (reservado para a etapa do
sorteio), `inscricao_id`, `email_titular`, `email_responsavel`, `status`
(`pendente`, `aceito`, `recusado`, `revogado`), `aceito_em`, `ip`,
`user_agent`, `token` (uuid único), `expira_em`, `created_at`, `updated_at`.

RLS: o dono (`usuario_id = auth.uid()`) e o admin leem; ninguém escreve direto
(só RPCs `SECURITY DEFINER`/`service_role`).

## RPCs

| RPC | Quem chama | Para que |
| --- | --- | --- |
| `registrar_aceite_termos(p_versao, p_ip, p_user_agent)` | logado | grava/renova o aceite da versão vigente |
| `termos_aceitos(p_versao)` | logado | informa se a versão vigente já foi aceita |
| `criar_consentimento_menor(email_responsavel, inscricao_id?, email_titular?, versao, ip, user_agent)` | logado (dono da inscrição) | cria ou reenvia o link do responsável (7 dias) |
| `responder_consentimento(token, aceito, ip, user_agent)` | público | registra aceite/recusa com data/hora/IP/origem |
| `consultar_consentimento_menor(token)` | público | mostra status, nome do titular e evento, sem e-mails |

## Server Actions (`src/lib/consentimentos/acoes.ts`)

- `registrarAceiteTermos(versao?)` — chamar depois de criar a conta ou no
  primeiro login, quando o usuário aceitar o checkbox dos termos.
- `verificarAceiteTermos(versao?)` — usar para bloquear/avisar quem ainda não
  aceitou.
- `criarConsentimentoMenor(estado, formData)` — campos `inscricao_id`
  (opcional) e `email_responsavel`.
- `responderConsentimento(formData)` — usado pela página pública.

IP e user agent são lidos de `headers()` em `src/lib/consentimentos/requisicao.ts`.

## Integração no cadastro (pendente de UI)

No formulário de cadastro/entrada:

1. Adicionar checkbox obrigatório “Li e aceito os [Termos de Uso](/termos) e a
   [Política de Privacidade](/privacidade)”; enviar `aceite_termos` no
   `FormData`.
2. Depois do `supabase.auth.signUp`/login com sessão, chamar
   `registrarAceiteTermos()` (Server Action) antes de redirecionar.
3. Para menor de idade: exibir campo de e-mail do responsável e, após criar a
   conta, chamar `criarConsentimentoMenor` com `inscricao_id` (quando houver)
   ou sem ele (cadastro). Mostrar o estado “Aguardando autorização do
   responsável” e, se necessário, permitir reenviar o link.
4. A confirmação de presença/inscrição deve considerar
   `consentimentos.status = 'aceito'` para `tipo = 'menor_responsavel'`.

A página `/consentimento/[token]` já recebe o link enviado ao responsável e
registra a resposta, mesmo sem conta no portal.

## Página pública

- `/consentimento/<token>` — consulta `consultar_consentimento_menor` e, se
  pendente e dentro do prazo, mostra “Autorizar cadastro” e “Recusar”.
- O token expira em 7 dias. `responder_consentimento` recusa token inválido,
  já respondido ou expirado.
- Nenhuma consulta pública devolve e-mail.
