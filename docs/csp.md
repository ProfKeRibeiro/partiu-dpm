# Content Security Policy (CSP)

**Status:** bloqueante desde 03/11/2026 (antes era `Report-Only`).
**Arquivo:** `next.config.ts`.

> **Nonce testado e descartado em 03/11/2026.** O nonce por requisição
> funciona nas rotas dinâmicas, mas não nas páginas com PPR/pré-renderização:
> o shell estático é gerado no build, sem o nonce da requisição, e seus scripts
> são bloqueados. Evidência e decisão na seção
> [Tentativa de nonce](#tentativa-de-nonce-03112026).
> Decisão confirmada pela responsável: manter `'unsafe-inline'` em
> `script-src` e preservar o PPR, em vez de tornar todas as páginas dinâmicas.

## Política final

```text
default-src 'self';
script-src 'self' 'unsafe-inline' https://vlibras.gov.br https://*.vlibras.gov.br https://cdn.jsdelivr.net https://cdn.userway.org https://*.userway.org;
style-src 'self' 'unsafe-inline' https://vlibras.gov.br https://*.vlibras.gov.br https://cdn.jsdelivr.net https://cdn.userway.org https://*.userway.org;
img-src 'self' data: blob: https://*.supabase.co https://vlibras.gov.br https://*.vlibras.gov.br https://cdn.jsdelivr.net https://cdn.userway.org https://*.userway.org https://api.userway.org;
font-src 'self' data: https://vlibras.gov.br https://*.vlibras.gov.br https://cdn.jsdelivr.net https://cdn.userway.org https://*.userway.org;
connect-src 'self' https://*.supabase.co https://vlibras.gov.br https://*.vlibras.gov.br https://cdn.jsdelivr.net https://api.userway.org https://*.userway.org;
media-src 'self' blob: https://vlibras.gov.br https://*.vlibras.gov.br;
frame-src 'self' https://vlibras.gov.br https://*.vlibras.gov.br https://*.userway.org;
worker-src 'self' blob:;
frame-ancestors 'self';
object-src 'none';
base-uri 'self';
form-action 'self'
```

## Por que cada exceção existe

| Diretiva | Motivo |
| --- | --- |
| `script-src 'unsafe-inline'` | O Next injeta scripts de bootstrap inline e o shell estático (PPR) não recebe nonce. Sem isso, a hidratação quebra. Ver a tentativa de nonce abaixo. |
| `style-src 'unsafe-inline'` | Tailwind/Next geram estilos inline no HTML. |
| `img-src data: blob:` | Logos/ícones embutidos e pré-visualizações locais. |
| `img-src https://*.supabase.co` | Avatares e capas de evento enviados pelo portal, servidos pelo Storage. |
| `connect-src https://*.supabase.co` | Chamadas do navegador ao Supabase (login, upload de avatar, leitura pública). |
| `media-src blob:` / `worker-src blob:` | Leitor de QR (`getUserMedia` + canvas/jsQR). |
| `vlibras.gov.br` e `*.vlibras.gov.br` | Widget oficial de Libras (script, estilos, mídia e iframe). |
| `cdn.jsdelivr.net` | O `vlibras.gov.br/app/vlibras-plugin.js` responde 302 para o espelho na jsDelivr; sem esse domínio o plugin não carrega. |
| `cdn.userway.org`, `*.userway.org` e `api.userway.org` | Menu de acessibilidade do UserWay (script, estilos, API de configuração e iframe). |
| `object-src 'none'`, `base-uri 'self'` | Bloqueia plugins e sequestro de URLs relativas. |
| `frame-ancestors 'self'` | Equivale ao `X-Frame-Options: SAMEORIGIN` já enviado. |

## Tentativa de nonce (03/11/2026)

Foi implementado nonce por requisição no `src/proxy.ts`, com
`script-src 'self' 'nonce-<valor>' 'strict-dynamic'`, header de requisição e de
resposta, e removido o CSP estático do `next.config.ts`.

Resultado com build de produção e Edge headless:

| Rota | Tipo de render | Scripts com nonce | Violações |
| --- | --- | --- | --- |
| `/entrar` | dinâmica | 17 de 17 | 0 |
| `/entrar?modo=criar` | dinâmica | 17 de 17 | 0 |
| `/conta` (redirect) | dinâmica | 17 de 17 | 0 |
| `/admin` (redirect) | dinâmica | 17 de 17 | 0 |
| `/` | PPR/estática | 8 de 20 | 12 |
| `/eventos` | PPR/estática | 9 de 21 | 12 |
| `/eventos/[id]` | PPR/estática | 12 de 25 | 13 |
| `/certificados` | PPR/estática | 5 de 19 | 14 |
| `/certificados/[codigo]` | PPR/estática | 11 de 24 | 13 |

O nonce mudava a cada requisição e o header não tinha `'unsafe-inline'`.
Ainda assim, o HTML pré-renderizado no build contém scripts sem nonce. Com
`'strict-dynamic'`, o navegador ignora a allowlist de host e bloqueia também os
chunks externos `_next/static/chunks/*.js`.

**Decisão:** não forçar. Para usar nonce sem violação seria necessário tornar
as páginas dinâmicas (por exemplo, desligar `cacheComponents`/PPR ou usar
`connection()` em todas as rotas), com custo de performance. O estado mantido é
a CSP bloqueante com `'unsafe-inline'` apenas em `script-src`.

## Testes executados (build de produção local)

Comando: `npm run build` + `npx next start -p 3007`.
Navegador: Microsoft Edge headless via `puppeteer-core`, capturando violações de CSP, erros de página e requisições falhas.

| Rota | Resultado | Observação |
| --- | --- | --- |
| `/` | 200 | estilos aplicados; imagens carregadas; 1 imagem lazy fora da viewport não carregada (esperado) |
| `/eventos` | 200 | sem violações |
| `/eventos/5224b37e-...` | 200 | imagem externa do evento carregada |
| `/entrar` | 200 | sem violações |
| `/certificados` | 200 | sem violações |
| `/certificados/a1ce7511-...` | 200 | imagem do certificado carregada |
| `/conta` | redireciona para `/entrar?next=%2Fconta` | sem sessão de teste |
| `/admin` | redireciona para `/entrar?next=%2Fadmin` | sem sessão de teste |
| `/api/certificados/a1ce7511-.../imagem` | 200, `image/svg+xml`, ~1,12 MB | contém `@font-face`, fontes `data:font/ttf` e o QR |

**Violações de CSP:** 0.
**Erros de página:** 0.
**Scripts externos:** 0 em todas as rotas.
**Tailwind:** cor de fundo computada `rgb(251, 248, 241)` nas rotas, confirmando que os estilos inline não foram bloqueados.

**Supabase:**
- `fetch` para `/rest/v1/eventos` a partir da página → 200 (origem permitida em `connect-src`).
- `<img>` apontando para o Storage → requisição chegou ao destino (404/ORB por o objeto ser privado/inexistente), sem violação de CSP.

**Leitor de QR:** o botão "Escanear o QR code" abriu o diálogo, criou o `<video>` e não gerou violação de CSP. Câmera real não foi usada (ambiente headless).

## Limitações

- `/conta` e `/admin` autenticados não foram testados em navegador por falta de sessão de teste. As páginas usam os mesmos assets do restante do site; o único recurso adicional é o avatar do Storage, já coberto por `img-src https://*.supabase.co`.
- O teste de câmera usou mídia simulada do navegador; a permissão real depende do usuário.
- `img-src` agora aceita apenas o próprio site e o Storage do Supabase; capas antigas foram migradas e o painel envia somente por upload. Se um dia for necessário exibir imagem externa, a diretiva precisa ser revista.

## Como reverter

Se algo quebrar em produção, trocar a chave do header de `Content-Security-Policy` para `Content-Security-Policy-Report-Only` em `next.config.ts` e publicar novamente. O modo observação não bloqueia recursos.

## Evolução recomendada

1. Manter novas imagens sempre no Storage (o painel já só oferece upload).
2. Reavaliar nonce somente se as rotas deixarem de usar PPR/pré-renderização estática. Hoje o nonce quebra o shell estático (ver seção acima).
3. Adicionar `report-uri`/`report-to` para coletar violações em produção.
