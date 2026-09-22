import type { Migracao } from '../migrador';

export const migracao0001: Migracao = {
  versao: 1,
  nome: '0001-cronogramas',
  sql: `
    CREATE TABLE cronogramas (
      id            TEXT PRIMARY KEY,
      nome          TEXT NOT NULL,
      descricao     TEXT,
      data_inicio   TEXT NOT NULL,
      data_fim      TEXT NOT NULL,
      situacao      TEXT NOT NULL,
      criado_em     TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
  `,
};
