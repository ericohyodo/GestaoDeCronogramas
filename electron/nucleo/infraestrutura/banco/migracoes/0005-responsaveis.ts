import type { Migracao } from '../migrador';

export const migracao0005: Migracao = {
  versao: 5,
  nome: '0005-responsaveis',
  sql: `
    CREATE TABLE responsaveis (
      id            TEXT PRIMARY KEY,
      nome          TEXT NOT NULL,
      email         TEXT,
      funcao        TEXT,
      ativo         INTEGER NOT NULL DEFAULT 1,
      criado_em     TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
  `,
};
