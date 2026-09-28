import type { Area } from './area';

export const PAPEIS_AV = ['padrao', 'visualizador'] as const;
export type PapelAv = (typeof PAPEIS_AV)[number];

/** Espelha o perfil global de `contratos/sessao.contrato.ts`, sem importar daquele módulo. */
export type PerfilGlobalAv = 'administrador' | 'gestor' | 'usuario' | 'visualizador';

export interface PerfilAvUsuario {
  usuarioId: string;
  papelAv: PapelAv;
  competencias: Area[];
}

export function perfilAvPadraoSemCompetencias(usuarioId: string): PerfilAvUsuario {
  return { usuarioId, papelAv: 'padrao', competencias: [] };
}

/**
 * Réplica de `podeEditarAreaNaAV` do app antigo: administrador global sempre pode; quem tem
 * `papel_av` "visualizador" nunca pode; os demais só se forem a pessoa designada para essa área
 * nesta AV específica. `competencias` não entra nesta checagem — ela é usada só para filtrar
 * quem pode *ser designado* a uma área (ver `AutorizacaoAv.exigirCompetencia`, usado em `CriarAv`);
 * exigir competência de novo aqui, além da designação em si, deixaria a própria pessoa já
 * escolhida pelo Comercial sem conseguir agir, até que um admin também lhe desse a competência
 * global — uma trava que o app antigo não tinha.
 */
export function podeEditarArea(
  perfilGlobal: PerfilGlobalAv,
  perfilAv: PerfilAvUsuario,
  membroDaArea: string | undefined,
): boolean {
  if (perfilGlobal === 'administrador') return true;
  if (perfilAv.papelAv === 'visualizador') return false;
  return membroDaArea === perfilAv.usuarioId;
}
