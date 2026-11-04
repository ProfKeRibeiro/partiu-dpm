-- Registrar no Supabase (MCP) para o bloco "Sorteio" aparecer na página
-- pública do evento.
--
-- A migração 20261104_sorteios-visitantes.sql deixou `sorteios` sem leitura
-- para `anon` (só organizador via RLS). Esta RPC SECURITY DEFINER devolve
-- apenas o mínimo do sorteio do evento (id, nome, status), sem participantes.

CREATE OR REPLACE FUNCTION public.consultar_sorteio_do_evento(p_evento_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'sorteio_id', s.id,
    'nome', s.nome,
    'status', s.status
  )
  from public.sorteios s
  join public.eventos e on e.id = s.evento_id
  where s.evento_id = p_evento_id
    and e.status = 'publicado'
    and s.status in ('aberto', 'realizado')
  order by s.created_at desc
  limit 1;
$function$;

REVOKE ALL ON FUNCTION public.consultar_sorteio_do_evento(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_sorteio_do_evento(uuid)
  TO anon, authenticated, service_role;
