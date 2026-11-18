import type { StatusReporteDTO, TipoReporteDTO } from '@contratos/reportes.contrato';
import type { Tom } from '@/compartilhado/ui/Etiqueta';

/** Rótulo e cor de cada status do reporte (lista, detalhe e log). */
export const STATUS_REPORTE_VISUAL: Record<StatusReporteDTO, { rotulo: string; tom: Tom }> = {
  aberto: { rotulo: 'Aberto', tom: 'alerta' },
  em_analise: { rotulo: 'Em análise', tom: 'info' },
  resolvido: { rotulo: 'Resolvido', tom: 'sucesso' },
  descartado: { rotulo: 'Descartado', tom: 'neutro' },
};

export const TIPO_REPORTE_VISUAL: Record<TipoReporteDTO, { rotulo: string; tom: Tom }> = {
  erro: { rotulo: 'Erro', tom: 'perigo' },
  sugestao: { rotulo: 'Sugestão', tom: 'destaque' },
};
