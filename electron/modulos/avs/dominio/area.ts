// Vocabulário próprio do domínio de AVs — não importa de `contratos` (a camada de domínio não
// conhece DTOs; a conversão acontece na camada de aplicação, em `mapeador-dto.ts`).
export const AREAS_AV = ['comercial', 'produto', 'processo', 'pcp', 'custo'] as const;
export type Area = (typeof AREAS_AV)[number];
