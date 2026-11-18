import type { StatusSdDTO } from '@contratos/sds.contrato';
import type { Tom } from '@/compartilhado/ui/Etiqueta';

/** Rótulo e cor de cada status da SD (lista, detalhe e AV). */
export const STATUS_SD_VISUAL: Record<StatusSdDTO, { rotulo: string; tom: Tom }> = {
  pre_sd: { rotulo: 'Pré-SD · Comercial', tom: 'alerta' },
  aberta: { rotulo: 'Aguardando aceite', tom: 'info' },
  fechada: { rotulo: 'Aceita · Projeto criado', tom: 'sucesso' },
  cancelada: { rotulo: 'Cancelada', tom: 'perigo' },
};
