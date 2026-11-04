-- Registrar no Supabase (MCP) antes de usar os recursos de equipe na página
-- pública do evento. Sem este GRANT, `anon` não lê as colunas novas de
-- `eventos` e a página cai no fallback "sem equipes".
--
-- Contexto: em `docs/banco-de-dados.md`, `anon` recebe SELECT apenas por coluna
-- em `eventos`; a migração 20261103_equipes-eventos.sql criou as colunas mas não
-- concedeu leitura a `anon`/`authenticated`.

GRANT SELECT (permite_equipes, equipe_min, equipe_max, exige_orientador)
  ON TABLE public.eventos TO anon, authenticated;
