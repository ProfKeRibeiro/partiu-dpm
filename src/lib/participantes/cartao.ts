export type CartaoParticipacao = {
  ok: boolean;
  motivo: string | null;
  nome: string | null;
  evento: string | null;
  avatarPath: string | null;
  autorizaImagem: boolean;
};

/** Mapeia a resposta da RPC `consultar_participacao_card` para o card. */
export function mapearCartaoParticipacao(payload: unknown): CartaoParticipacao {
  const dados = (payload ?? {}) as Record<string, unknown>;
  const ok = dados.ok === true;
  const motivo =
    typeof dados.motivo === "string" ? dados.motivo : ok ? null : "cartao_indisponivel";

  return {
    ok,
    motivo,
    nome: typeof dados.nome === "string" ? dados.nome : null,
    evento: typeof dados.evento === "string" ? dados.evento : null,
    avatarPath: typeof dados.avatar_path === "string" ? dados.avatar_path : null,
    autorizaImagem: dados.autoriza_imagem === true,
  };
}

/** O card só pode ser gerado com autorização explícita e não revogada. */
export function podeGerarCartaoParticipacao(dados: CartaoParticipacao): boolean {
  return dados.ok && dados.autorizaImagem;
}
