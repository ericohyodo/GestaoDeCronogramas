import type { Migracao } from '../migrador';

// Arquivo das análises feitas pela IA. Sem FK para cronogramas: o histórico continua disponível
// mesmo se o cronograma for excluído (o título fica guardado na própria análise).
export const migracao0009: Migracao = {
  versao: 9,
  nome: '0009-arquivo-de-analises',
  sql: `
    CREATE TABLE ia_analises (
      id            TEXT PRIMARY KEY,
      tipo          TEXT NOT NULL CHECK (tipo IN ('cronograma', 'portfolio')),
      cronograma_id TEXT,
      titulo        TEXT NOT NULL,
      modelo        TEXT NOT NULL,
      saude         TEXT NOT NULL,
      gerada_em     TEXT NOT NULL,
      gerada_por    TEXT,
      conteudo      TEXT NOT NULL
    );

    CREATE INDEX idx_ia_analises_data ON ia_analises (gerada_em);
    CREATE INDEX idx_ia_analises_cronograma ON ia_analises (cronograma_id, gerada_em);
  `,
};
