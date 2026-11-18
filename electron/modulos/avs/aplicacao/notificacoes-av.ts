import type { Area } from '../dominio/area';
import type { Av } from '../dominio/av';

// Textos e destinatários das notificações do módulo de AVs (sino da barra superior).

export const ROTULO_DA_AREA: Record<Area, string> = {
  comercial: 'Comercial',
  produto: 'Eng. Produto',
  processo: 'Eng. Processo',
  pcp: 'PCP',
  custo: 'Mapa de Custo',
};

/** Rota do detalhe da AV, aberta ao clicar na notificação. */
export const linkDaAv = (avId: string) => `/avs/detalhe/?id=${avId}`;

/** "Cliente · Descrição" para o corpo da notificação. */
export const resumoDaAv = (av: Pick<Av, 'cliente' | 'descricao'>) =>
  [av.cliente, av.descricao].filter(Boolean).join(' · ');

/** Todos os responsáveis designados na AV (sem repetição). */
export const equipeDaAv = (av: Pick<Av, 'membros'>): string[] => [
  ...new Set(Object.values(av.membros).filter((id): id is string => !!id)),
];

/**
 * Áreas novas de cada pessoa ao comparar a equipe antes e depois (quem já respondia pela área não é avisado).
 * @returns usuário → áreas que passou a assumir
 */
export function novasDesignacoes(
  antes: Partial<Record<Area, string>>,
  depois: Partial<Record<Area, string>>,
): Map<string, Area[]> {
  const resultado = new Map<string, Area[]>();
  for (const [area, usuarioId] of Object.entries(depois) as [Area, string | undefined][]) {
    if (!usuarioId || antes[area] === usuarioId) continue;
    resultado.set(usuarioId, [...(resultado.get(usuarioId) ?? []), area]);
  }
  return resultado;
}
