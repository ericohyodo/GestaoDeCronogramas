import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';

export const SITUACOES_CRONOGRAMA = ['planejado', 'em_andamento', 'concluido', 'arquivado'] as const;
export type SituacaoCronograma = (typeof SITUACOES_CRONOGRAMA)[number];

export function validarSituacaoCronograma(valor: string): SituacaoCronograma {
  if (!(SITUACOES_CRONOGRAMA as readonly string[]).includes(valor)) {
    throw new ErroDeValidacao(`Situação de cronograma inválida: "${valor}".`);
  }
  return valor as SituacaoCronograma;
}
