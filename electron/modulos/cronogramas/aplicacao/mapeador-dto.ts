import type { CronogramaDTO } from '@contratos/cronogramas.contrato';
import type { Cronograma } from '../dominio/cronograma';

export function paraCronogramaDTO(cronograma: Cronograma): CronogramaDTO {
  return {
    id: cronograma.id,
    nome: cronograma.nome,
    descricao: cronograma.descricao,
    dataInicio: cronograma.periodo.inicio,
    dataFim: cronograma.periodo.fim,
    duracaoEmDias: cronograma.periodo.duracaoEmDias,
    situacao: cronograma.situacao,
    criadoEm: cronograma.criadoEm.toISOString(),
    atualizadoEm: cronograma.atualizadoEm.toISOString(),
  };
}
