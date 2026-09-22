import type { Migracao } from '../migrador';

// A FK para `cronogramas` atravessa módulos: concessão pragmática desta versão inicial.
// Evolução prevista: o módulo de tarefas reagir a um evento `CronogramaExcluido`.
export const migracao0002: Migracao = {
  versao: 2,
  nome: '0002-tarefas',
  sql: `
    CREATE TABLE tarefas (
      id                   TEXT PRIMARY KEY,
      cronograma_id        TEXT NOT NULL REFERENCES cronogramas (id) ON DELETE CASCADE,
      titulo               TEXT NOT NULL,
      descricao            TEXT,
      data_inicio          TEXT NOT NULL,
      data_fim             TEXT NOT NULL,
      percentual_concluido INTEGER NOT NULL DEFAULT 0
                           CHECK (percentual_concluido BETWEEN 0 AND 100),
      situacao             TEXT NOT NULL,
      ordem                INTEGER NOT NULL,
      criado_em            TEXT NOT NULL,
      atualizado_em        TEXT NOT NULL
    );

    CREATE INDEX idx_tarefas_cronograma ON tarefas (cronograma_id, ordem);
  `,
};
