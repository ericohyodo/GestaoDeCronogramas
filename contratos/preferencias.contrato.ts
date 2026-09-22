export const TEMAS = ['sistema', 'claro', 'escuro'] as const;
export type TemaDTO = (typeof TEMAS)[number];

export interface PreferenciasDTO {
  tema: TemaDTO;
}
