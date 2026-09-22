import { SITUACOES_CRONOGRAMA, type SituacaoCronogramaDTO } from '@contratos/cronogramas.contrato';
import type { OpcaoSelecao } from '@/compartilhado/ui/Campos';
import type { Tom } from '@/compartilhado/ui/Etiqueta';

export const ROTULO_SITUACAO: Record<SituacaoCronogramaDTO, string> = {
  planejado: 'Planejado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  arquivado: 'Arquivado',
};

export const TOM_SITUACAO: Record<SituacaoCronogramaDTO, Tom> = {
  planejado: 'info',
  em_andamento: 'destaque',
  concluido: 'sucesso',
  arquivado: 'neutro',
};

export const OPCOES_SITUACAO: OpcaoSelecao[] = SITUACOES_CRONOGRAMA.map((situacao) => ({
  valor: situacao,
  rotulo: ROTULO_SITUACAO[situacao],
}));
