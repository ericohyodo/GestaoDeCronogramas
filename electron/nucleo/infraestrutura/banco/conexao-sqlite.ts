import Database from 'better-sqlite3';

export type BancoDeDados = Database.Database;

/**
 * Abre o arquivo SQLite. Usa o journal padrão (DELETE) em vez de WAL: no modo portátil
 * o banco é um arquivo único, sem `-wal`/`-shm` que o usuário poderia esquecer de copiar.
 */
export function abrirConexao(caminho: string): BancoDeDados {
  const db = new Database(caminho);
  db.pragma('journal_mode = DELETE');
  db.pragma('foreign_keys = ON');
  return db;
}
