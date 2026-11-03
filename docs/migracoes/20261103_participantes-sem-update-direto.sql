-- Aplicada no Supabase em 03/11/2026 (migração
-- `participantes_sem_update_direto`).
--
-- Mesmo com RLS, `authenticated` ainda tinha `UPDATE` direto na tabela, o que
-- permitiria editar campos fora da RPC (por exemplo `categoria`, usada nas
-- regras de público-alvo). Todo o perfil passa pela RPC
-- `atualizar_perfil_participante`.
--
-- Estado final conferido em `information_schema.column_privileges`:
-- `authenticated` tem apenas `SELECT` em `public.participantes`; `anon` não tem
-- privilégio nenhum; escrita só pela RPC `SECURITY DEFINER`.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.participantes FROM PUBLIC, anon, authenticated;
