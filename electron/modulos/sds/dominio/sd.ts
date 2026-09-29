export type StatusSd = 'pre_sd' | 'aberta' | 'fechada' | 'cancelada';

export interface Sd {
  id: string;
  avId: string;
  numero: string;
  status: StatusSd;
  criadoPor: string | null;
  criadoEm: Date;
}

/** A SD e o projeto herdam o sequencial/ano da AV: só o prefixo muda (`AV 0007-26` → `SD 0007-26`). */
export function trocarPrefixoDoNumero(numeroAv: string, prefixo: 'SD' | 'PRO'): string {
  return numeroAv.replace(/^\S+/, prefixo);
}

/** Uma SD junto com os dados da AV de origem que a lista precisa mostrar. */
export interface SdListada {
  sd: Sd;
  avNumero: string;
  cliente: string | null;
  descricao: string;
}
