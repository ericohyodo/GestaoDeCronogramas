import type { Migracao } from '../migrador';

// O arquivo de análises passa a aceitar o tipo 'avs' (análise das AVs feita pela IA). O SQLite não altera
// CHECK de coluna, então a tabela é refeita com os mesmos dados.
export const migracao0026: Migracao = {
  versao: 26,
  nome: '0026-ia-analises-de-avs',
  sql: `
    CREATE TABLE ia_analises_nova (
      id            TEXT PRIMARY KEY,
      tipo          TEXT NOT NULL CHECK (tipo IN ('cronograma', 'portfolio', 'avs')),
      cronograma_id TEXT,
      titulo        TEXT NOT NULL,
      modelo        TEXT NOT NULL,
      saude         TEXT NOT NULL,
      gerada_em     TEXT NOT NULL,
      gerada_por    TEXT,
      conteudo      TEXT NOT NULL
    );

    INSERT INTO ia_analises_nova
      SELECT id, tipo, cronograma_id, titulo, modelo, saude, gerada_em, gerada_por, conteudo FROM ia_analises;

    DROP TABLE ia_analises;
    ALTER TABLE ia_analises_nova RENAME TO ia_analises;

    CREATE INDEX idx_ia_analises_data ON ia_analises (gerada_em);
    CREATE INDEX idx_ia_analises_cronograma ON ia_analises (cronograma_id, gerada_em);
  `,
};
