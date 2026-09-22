import type { Tarefa } from './tarefa';

export interface RepositorioTarefas {
  listarPorCronograma(cronogramaId: string): Promise<Tarefa[]>;
  obterPorId(id: string): Promise<Tarefa | null>;
  /** Próximo valor de `ordem` dentro da fase, ou entre as tarefas soltas quando `faseId` é null. */
  proximaOrdem(cronogramaId: string, faseId: string | null): Promise<number>;
  /** Insere ou atualiza, incluindo as dependências. */
  salvar(tarefa: Tarefa): Promise<void>;
  /** Grava várias tarefas numa única transação (deslocamento em cadeia). */
  salvarVarias(tarefas: readonly Tarefa[]): Promise<void>;
  excluir(id: string): Promise<void>;
  /** Atualiza só o campo `ordem` de várias tarefas numa única transação. */
  atualizarOrdens(ordens: { id: string; ordem: number }[]): Promise<void>;
}
