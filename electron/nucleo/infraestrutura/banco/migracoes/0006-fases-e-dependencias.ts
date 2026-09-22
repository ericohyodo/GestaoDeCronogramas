import type { Migracao } from '../migrador';

// Fases agrupam tarefas (dois níveis). A FK de responsável atravessa módulos, como a de cronograma:
// concessão pragmática, documentada no README.
export const migracao0006: Migracao = {
  versao: 6,
  nome: '0006-fases-e-dependencias',
  sql: `
    CREATE TABLE fases (
      id            TEXT PRIMARY KEY,
      cronograma_id TEXT NOT NULL REFERENCES cronogramas (id) ON DELETE CASCADE,
      nome          TEXT NOT NULL,
      ordem         INTEGER NOT NULL,
      criado_em     TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );

    CREATE INDEX idx_fases_cronograma ON fases (cronograma_id, ordem);

    ALTER TABLE tarefas ADD COLUMN fase_id TEXT REFERENCES fases (id) ON DELETE CASCADE;
    ALTER TABLE tarefas ADD COLUMN responsavel_id TEXT REFERENCES responsaveis (id) ON DELETE SET NULL;

    CREATE TABLE dependencias_tarefas (
      tarefa_id      TEXT NOT NULL REFERENCES tarefas (id) ON DELETE CASCADE,
      predecessora_id TEXT NOT NULL REFERENCES tarefas (id) ON DELETE CASCADE,
      PRIMARY KEY (tarefa_id, predecessora_id)
    );

    CREATE INDEX idx_dependencias_predecessora ON dependencias_tarefas (predecessora_id);
  `,
};
