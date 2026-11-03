# QA e testes

Ferramentas de verificação do partiu-dpm e o último resultado conhecido.
Complementa a seção "Validação executada" do `README.md`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run lint` | ESLint (inclui os arquivos de teste). |
| `npx tsc --noEmit` | Checagem de tipos. |
| `npm test` | Testes unitários (Vitest). |
| `npm run build` | Build de produção. |
| `npm run qa:smoke` | Smoke HTTP contra produção. |
| `node scripts/qa-smoke.mjs --base-url http://localhost:3100` | Smoke contra build local (`next start`). |
| `node scripts/qa-smoke.mjs --certificado <codigo>` | Valida também uma página de certificado emitido. |

O smoke cobre rotas públicas (`200`), rotas de sessão sem login (`307` para
`/entrar?next=...`) e o cron sem token (`401`). Ele apenas lê, não escreve.

## Teste de banco dos convites

`scripts/qa-convites.sql` roda em uma única instrução (`do $qa$ ... $qa$`) via
MCP do Supabase e verifica:

1. evento iniciado não convoca (`evento_iniciado`);
2. evento não publicado não convoca (`evento_indisponivel`);
3. evento futuro convoca a primeira pessoa da fila;
4. segundo convite no mesmo evento retorna `convite_pendente` (índice único
   parcial + trava por evento);
5. `registrar_aviso_email` exige dono/admin/`service_role` e respeita a janela
   de deduplicação;
6. `inscrever_em_evento` continua funcionando no fluxo normal.

Se qualquer asserção falhar, a instrução inteira é revertida. No sucesso, os
eventos temporários são apagados no fim. Requer pelo menos 2 participantes.

## Evidência de 03/11/2026

Executado no repositório local e no projeto Supabase de produção:

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Sem erros. |
| `npx tsc --noEmit` | Sem erros. |
| `npm test` | 2 arquivos, 13 testes aprovados. |
| `npm run build` | 27 rotas geradas. |
| `npm run qa:smoke` | 8 verificações aprovadas em `https://partiu-dpm.vercel.app`. |
| `scripts/qa-convites.sql` | Asserções aprovadas; dados temporários removidos. |
| Estado do banco após o teste | 3 eventos, 5 inscrições, 0 convocações, 0 avisos. |

Variáveis de ambiente: as chaves de servidor (`CRON_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `EMAIL_REMETENTE`,
`EMAIL_REMETENTE_NOME`) existem em **Production**. O ambiente **Preview** não as
tem: para validar convites e e-mail em preview é preciso cadastrá-las lá
(`vercel env add ... preview`).

## Limitações conhecidas

- **Soft 404**: as páginas dinâmicas (`/eventos/[id]`, `/certificados/[codigo]`)
  transmitem o shell antes da consulta e respondem `200` mesmo quando o registro
  não existe; o corpo mostra a página 404 e o Next injeta `noindex`. O teste de
  existência deve olhar o conteúdo, não só o status.
- **Cron sem token** responde `401` por design; isso não valida o cron de
  verdade, apenas a proteção do endpoint.
- **E-mail real** não é enviado pelo smoke: validar entrega exige conferir o
  Brevo (Transactional → Logs) após uma ação real.
