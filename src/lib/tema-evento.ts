import type { CSSProperties } from "react";

export const TEMAS_EVENTO = [
  ["esmeralda", "Esmeralda", "#15803d", "#166534", "#dcfce7", "#f0fdf4"],
  ["verde-floresta", "Verde floresta", "#2f6b3b", "#1d4d2a", "#dcedd8", "#f4faf1"],
  ["lima", "Lima", "#4d7c0f", "#3f6212", "#ecfccb", "#f7fee7"],
  ["teal", "Teal", "#0f766e", "#115e59", "#ccfbf1", "#f0fdfa"],
  ["ciano", "Ciano", "#0e7490", "#155e75", "#cffafe", "#ecfeff"],
  ["azul-celeste", "Azul celeste", "#0369a1", "#075985", "#e0f2fe", "#f0f9ff"],
  ["azul", "Azul", "#1d4ed8", "#1e40af", "#dbeafe", "#eff6ff"],
  ["indigo", "Índigo", "#4338ca", "#3730a3", "#e0e7ff", "#eef2ff"],
  ["violeta", "Violeta", "#6d28d9", "#5b21b6", "#ede9fe", "#f5f3ff"],
  ["roxo", "Roxo", "#7e22ce", "#6b21a8", "#f3e8ff", "#faf5ff"],
  ["fucsia", "Fúcsia", "#a21caf", "#86198f", "#fae8ff", "#fdf4ff"],
  ["rosa", "Rosa", "#be185d", "#9d174d", "#fce7f3", "#fdf2f8"],
  ["framboesa", "Framboesa", "#be123c", "#9f1239", "#ffe4e6", "#fff1f2"],
  ["vermelho", "Vermelho", "#b91c1c", "#991b1b", "#fee2e2", "#fef2f2"],
  ["laranja", "Laranja", "#c2410c", "#9a3412", "#ffedd5", "#fff7ed"],
  ["ambar", "Âmbar", "#b45309", "#92400e", "#fef3c7", "#fffbeb"],
  ["dourado", "Dourado", "#a16207", "#854d0e", "#fef9c3", "#fefce8"],
  ["oliva", "Oliva", "#556b2f", "#3f5122", "#edf2dc", "#f8faef"],
  ["terracota", "Terracota", "#b4533b", "#8f3d2a", "#fce8df", "#fdf5f1"],
  ["coral", "Coral", "#c2414b", "#9f2f38", "#ffe4e6", "#fff4f4"],
  ["vinho", "Vinho", "#881337", "#70102d", "#fce7f3", "#fff1f2"],
  ["cafe", "Café", "#78350f", "#5c280c", "#fef3c7", "#fffbeb"],
  ["ardosia", "Ardósia", "#475569", "#334155", "#e2e8f0", "#f8fafc"],
  ["grafite", "Grafite", "#374151", "#1f2937", "#e5e7eb", "#f9fafb"],
  ["turquesa", "Turquesa", "#0f766e", "#134e4a", "#ccfbf1", "#f0fdfa"],
  ["azul-petroleo", "Azul petróleo", "#155e75", "#164e63", "#cffafe", "#ecfeff"],
  ["azul-marinho", "Azul-marinho", "#1e3a8a", "#172554", "#dbeafe", "#eff6ff"],
  ["lavanda", "Lavanda", "#7c3aed", "#5b21b6", "#ede9fe", "#f5f3ff"],
  ["ameixa", "Ameixa", "#86198f", "#701a75", "#fae8ff", "#fdf4ff"],
  ["magenta", "Magenta", "#9d174d", "#831843", "#fce7f3", "#fdf2f8"],
  ["rubi", "Rubi", "#9f1239", "#881337", "#ffe4e6", "#fff1f2"],
  ["cobre", "Cobre", "#9a3412", "#7c2d12", "#ffedd5", "#fff7ed"],
] as const;

export type TemaEventoId = (typeof TEMAS_EVENTO)[number][0];

type TemaEvento = {
  id: TemaEventoId;
  nome: string;
  primaria: string;
  escura: string;
  suave: string;
  fundo: string;
};

export const TEMA_EVENTO_PADRAO: TemaEventoId = "azul-petroleo";

export const temasEvento: readonly TemaEvento[] = TEMAS_EVENTO.map(
  ([id, nome, primaria, escura, suave, fundo]) => ({
    id,
    nome,
    primaria,
    escura,
    suave,
    fundo,
  }),
);

export function temaEventoValido(valor: string): valor is TemaEventoId {
  return TEMAS_EVENTO.some(([id]) => id === valor);
}

export function obterTemaEvento(valor: string | null | undefined): TemaEvento {
  return (
    temasEvento.find((tema) => tema.id === valor) ??
    temasEvento.find((tema) => tema.id === TEMA_EVENTO_PADRAO)!
  );
}

export function estiloTemaEvento(
  tema: TemaEvento,
): CSSProperties & Record<"--tema-primaria" | "--tema-escura" | "--tema-suave" | "--tema-fundo", string> {
  return {
    "--tema-primaria": tema.primaria,
    "--tema-escura": tema.escura,
    "--tema-suave": tema.suave,
    "--tema-fundo": tema.fundo,
  };
}
