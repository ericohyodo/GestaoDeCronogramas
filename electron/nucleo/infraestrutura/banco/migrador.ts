import type { BancoDeDados } from './conexao-sqlite';

export interface Migracao {
  versao: number;
  nome: string;
  sql: string;
}

/** Aplica, em ordem e cada uma em sua transação, as migrações ainda não registradas. */
export function executarMigracoes(db: BancoDeDados, migracoes: readonly Migracao[]): string[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
      versao      INTEGER PRIMARY KEY,
      nome        TEXT NOT NULL,
      aplicada_em TEXT NOT NULL
    )
  `);

  const aplicadas = new Set(
    db.prepare('SELECT versao FROM migracoes_aplicadas').pluck().all() as number[],
  );
  const registrar = db.prepare(
    'INSERT INTO migracoes_aplicadas (versao, nome, aplicada_em) VALUES (?, ?, ?)',
  );

  const pendentes = [...migracoes]
    .sort((a, b) => a.versao - b.versao)
    .filter((migracao) => !aplicadas.has(migracao.versao));

  for (const migracao of pendentes) {
    db.transaction(() => {
      db.exec(migracao.sql);
      registrar.run(migracao.versao, migracao.nome, new Date().toISOString());
    })();
  }

  return pendentes.map((migracao) => migracao.nome);
}
