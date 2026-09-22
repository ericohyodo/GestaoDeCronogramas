import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';

export const SITUACOES_TAREFA = ['pendente', 'em_andamento', 'concluida'] as const;
export type SituacaoTarefa = (typeof SITUACOES_TAREFA)[number];

export function validarSituacaoTarefa(valor: string): SituacaoTarefa {
  if (!(SITUACOES_TAREFA as readonly string[]).includes(valor)) {
    throw new ErroDeValidacao(`Situação de tarefa inválida: "${valor}".`);
  }
  return valor as SituacaoTarefa;
}
