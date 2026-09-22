import type { Cronograma } from './cronograma';

export interface RepositorioCronogramas {
  listar(): Promise<Cronograma[]>;
  obterPorId(id: string): Promise<Cronograma | null>;
  existe(id: string): Promise<boolean>;
  /** Insere ou atualiza. */
  salvar(cronograma: Cronograma): Promise<void>;
  excluir(id: string): Promise<void>;
}
