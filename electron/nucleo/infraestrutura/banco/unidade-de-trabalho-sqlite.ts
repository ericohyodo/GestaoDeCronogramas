import type { UnidadeDeTrabalho } from '../../aplicacao/portas/unidade-de-trabalho';
import type { BancoDeDados } from './conexao-sqlite';

/**
 * Transação SQLite em volta de um caso de uso assíncrono. Funciona porque os repositórios usam o
 * better-sqlite3 (síncrono): as Promises resolvem em microtarefas, sem ceder o laço de eventos a outra
 * chamada IPC no meio. Não use com trabalho que faça E/S assíncrona de verdade (arquivos, rede).
 * `BEGIN IMMEDIATE` reserva a escrita já no início, evitando deadlock entre dois PCs.
 * Chamadas aninhadas reaproveitam a transação externa.
 */
export class UnidadeDeTrabalhoSqlite implements UnidadeDeTrabalho {
  constructor(private readonly db: BancoDeDados) {}

  async executar<T>(trabalho: () => Promise<T>): Promise<T> {
    if (this.db.inTransaction) return trabalho();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const resultado = await trabalho();
      this.db.exec('COMMIT');
      return resultado;
    } catch (erro) {
      if (this.db.inTransaction) this.db.exec('ROLLBACK');
      throw erro;
    }
  }
}
