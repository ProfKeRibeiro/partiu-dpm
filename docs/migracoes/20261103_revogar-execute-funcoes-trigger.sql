-- Aplicada no Supabase em 03/11/2026.
-- Funções de trigger não precisam de EXECUTE para `anon`/`authenticated`: o
-- PostgreSQL executa o trigger como dono da tabela, sem checar o grant do
-- chamador. Revogar reduz a superfície exposta em /rest/v1/rpc e elimina os
-- avisos do Advisor de SECURITY DEFINER executável sem sessão.

REVOKE ALL ON FUNCTION public.notificar_inscricao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notificar_presenca() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notificar_certificado() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.impedir_reabertura_evento() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.atualizar_contagem_inscritos() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.definir_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_publico_alvo_inscricao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.criar_perfil_participante() FROM PUBLIC, anon, authenticated;
