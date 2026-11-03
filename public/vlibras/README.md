# VLibras (self-host do loader)

- Arquivo: `vlibras-plugin.js`
- Versão: **v7.12.2**
- Origem: `https://vlibras.gov.br/app/vlibras-plugin.js` (redireciona para
  `https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/vlibras-portal@v7.12.2/app/vlibras-plugin.js`)
- Tamanho: 2.368 bytes
- SHA-256: `267BA6E2B10110CDD5BFB2D6BD4AD35398707D24222FD02D83C121509182E6F7`

O conteúdo foi salvo sem alterações. O loader só cria o botão; ao abrir o
tradutor ele carrega `vlibras-plugin-app.js` e os avatares a partir de
`https://vlibras.gov.br/app`, que precisa continuar liberado no CSP
(`script-src`, `img-src`, `media-src`, `connect-src` e `frame-src` conforme o
widget usar).

Para atualizar: baixe novamente a mesma URL, confira o hash e ajuste a versão
no comentário do componente `src/components/site/vlibras.tsx` se necessário.
