export const STATUS_SD = ['pre_sd', 'aberta', 'fechada', 'cancelada'] as const;
export type StatusSdDTO = (typeof STATUS_SD)[number];

export interface SdDTO {
  id: string;
  /** Mesmo sequencial e ano da AV de origem: AV 26-007 → SD 26-007. */
  numero: string;
  avId: string;
  avNumero: string;
  cliente: string | null;
  descricao: string;
  status: StatusSdDTO;
  /** Número que o projeto terá no módulo de Projetos (PRO 26-007). */
  numeroProjeto: string;
  criadoEm: string;
}
