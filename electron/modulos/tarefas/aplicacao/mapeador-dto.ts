import type { TarefaDTO } from '@contratos/tarefas.contrato';
import type { Tarefa } from '../dominio/tarefa';

export function paraTarefaDTO(tarefa: Tarefa): TarefaDTO {
  return {
    id: tarefa.id,
    cronogramaId: tarefa.cronogramaId,
    faseId: tarefa.faseId,
    titulo: tarefa.titulo,
    descricao: tarefa.descricao,
    dataInicio: tarefa.periodo.inicio,
    dataFim: tarefa.periodo.fim,
    duracaoEmDias: tarefa.periodo.duracaoEmDias,
    percentualConcluido: tarefa.percentualConcluido,
    situacao: tarefa.situacao,
    responsavelId: tarefa.responsavelId,
    evidencia: tarefa.evidencia,
    dependencias: tarefa.dependencias,
    ordem: tarefa.ordem,
    criadoEm: tarefa.criadoEm.toISOString(),
    atualizadoEm: tarefa.atualizadoEm.toISOString(),
  };
}
