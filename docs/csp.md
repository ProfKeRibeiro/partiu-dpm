# Content Security Policy (CSP)

**Status:** bloqueante desde 03/11/2026 (antes era `Report-Only`).
**Arquivo:** `next.config.ts`.

## Política final

```text
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://*.supabase.co https:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co;
media-src 'self' blob:;
worker-src 'self' blob:;
frame-ancestors 'self';
object-src 'none';
base-uri 'self';
form-action 'self'
```

## Por que cada exceção existe

| Diretiva | Motivo |
| --- | --- |
| `script-src 'unsafe-inline'` | O Next injeta scripts de bootstrap inline. Sem isso, a hidratação quebra. A evolução é usar nonce e remover a exceção. |
| `style-src 'unsafe-inline'` | Tailwind/Next geram estilos inline no HTML. |
| `img-src data: blob:` | Logos/ícones embutidos e pré-visualizações locais. |
| `img-src https://*.supabase.co` | Fotos de perfil e imagens no Storage. |
| `img-src https:` | O painel aceita qualquer URL de imagem para o evento (o "MongoDB Day" usa uma miniatura externa). Imagem não executa script, então o risco é contido; o ideal é migrar as imagens para o Storage e remover esta diretiva. |
| `connect-src https://*.supabase.co` | Chamadas do navegador ao Supabase (login, upload de avatar, leitura pública). |
| `media-src blob:` / `worker-src blob:` | Leitor de QR (`getUserMedia` + canvas/jsQR). |
| `object-src 'none'`, `base-uri 'self'` | Bloqueia plugins e sequestro de URLs relativas. |
| `frame-ancestors 'self'` | Equivale ao `X-Frame-Options: SAMEORIGIN` já enviado. |

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
- `img-src https:` mantém dependência de hosts externos para imagens de evento cadastradas no painel. Migrar para o Storage permite voltar à lista fechada.

## Como reverter

Se algo quebrar em produção, trocar a chave do header de `Content-Security-Policy` para `Content-Security-Policy-Report-Only` em `next.config.ts` e publicar novamente. O modo observação não bloqueia recursos.

## Evolução recomendada

1. Migrar as imagens de evento para o Storage e remover `https:` de `img-src`.
2. Adotar nonce para scripts (Next 16 permite via proxy) e remover `'unsafe-inline'` de `script-src`.
3. Adicionar `report-uri`/`report-to` para coletar violações em produção.
