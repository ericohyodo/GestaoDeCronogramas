import type { Fase } from './fase';

export interface RepositorioFases {
  listarPorCronograma(cronogramaId: string): Promise<Fase[]>;
  obterPorId(id: string): Promise<Fase | null>;
  /** Próxima posição no nível de topo, compartilhada com as tarefas soltas. */
  proximaOrdemDeTopo(cronogramaId: string): Promise<number>;
  salvar(fase: Fase): Promise<void>;
  excluir(id: string): Promise<void>;
  /** Atualiza só o campo `ordem` de várias fases numa única transação. */
  atualizarOrdens(ordens: { id: string; ordem: number }[]): Promise<void>;
}
