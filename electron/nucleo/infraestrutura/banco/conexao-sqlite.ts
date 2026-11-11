import Database from 'better-sqlite3';

export type BancoDeDados = Database.Database;

/** Tempo (ms) que uma gravação espera o arquivo ser liberado por outro PC antes de desistir. */
export const ESPERA_BANCO_OCUPADO_MS = 5000;

/**
 * Abre o arquivo SQLite. Usa o journal padrão (DELETE) em vez de WAL: o banco fica numa pasta de rede
 * compartilhada e o WAL exige memória compartilhada, que não funciona entre PCs. `busy_timeout` faz uma
 * gravação esperar o bloqueio de outro usuário em vez de falhar na hora com "database is locked".
 */
export function abrirConexao(caminho: string): BancoDeDados {
  const db = new Database(caminho);
  db.pragma('journal_mode = DELETE');
  db.pragma('foreign_keys = ON');
  db.pragma(`busy_timeout = ${ESPERA_BANCO_OCUPADO_MS}`);
  return db;
}

/** O erro veio do SQLite por o arquivo estar bloqueado por outro processo/PC (SQLITE_BUSY/LOCKED)? */
export function ehErroDeBancoOcupado(erro: unknown): boolean {
  const codigo = (erro as { code?: unknown } | null)?.code;
  return typeof codigo === 'string' && /^SQLITE_(BUSY|LOCKED)/.test(codigo);
}
