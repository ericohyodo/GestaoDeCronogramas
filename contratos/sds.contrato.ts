export const STATUS_SD = ['pre_sd', 'aberta', 'fechada', 'cancelada'] as const;
export type StatusSdDTO = (typeof STATUS_SD)[number];

export interface SdDTO {
  id: string;
  /** Mesmo sequencial e ano da AV de origem: AV 0007-26 → SD 0007-26. */
  numero: string;
  avId: string;
  avNumero: string;
  cliente: string | null;
  descricao: string;
  status: StatusSdDTO;
  /** Número que o projeto terá no módulo de Projetos (PRO 0007-26). */
  numeroProjeto: string;
  criadoEm: string;
}
