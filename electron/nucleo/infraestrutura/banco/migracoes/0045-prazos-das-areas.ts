import type { Migracao } from '../migrador';

// Prazo de cada área da AV (Produto, Processo, PCP, Custo) em dias úteis, contado a partir da liberação da
// etapa. `av_prazo_config` guarda os dias por área (padrão 3; o administrador ajusta). `av_prazos_area`
// grava o prazo de cada etapa no momento em que ela chega à área — mudar a configuração depois não altera
// prazos em curso — e a data em que a etapa saiu (entrega).
export const migracao0045: Migracao = {
  versao: 45,
  nome: '0045-prazos-das-areas',
  sql: `
    CREATE TABLE av_prazo_config (
      area           TEXT PRIMARY KEY CHECK (area IN ('produto', 'processo', 'pcp', 'custo')),
      dias_uteis     INTEGER NOT NULL CHECK (dias_uteis BETWEEN 1 AND 30),
      atualizado_em  TEXT NOT NULL,
      atualizado_por TEXT REFERENCES usuarios(id)
    );

    INSERT INTO av_prazo_config (area, dias_uteis, atualizado_em) VALUES
      ('produto',  3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      ('processo', 3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      ('pcp',      3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      ('custo',    3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

    CREATE TABLE av_prazos_area (
      id           TEXT PRIMARY KEY,
      av_id        TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      etapa        INTEGER NOT NULL CHECK (etapa BETWEEN 2 AND 5),
      area         TEXT NOT NULL CHECK (area IN ('produto', 'processo', 'pcp', 'custo')),
      dias_uteis   INTEGER NOT NULL CHECK (dias_uteis BETWEEN 1 AND 30),
      iniciada_em  TEXT NOT NULL,
      data_limite  TEXT NOT NULL,
      entregue_em  TEXT,
      UNIQUE (av_id, etapa)
    );

    CREATE INDEX idx_av_prazos_area_abertos ON av_prazos_area (entregue_em, data_limite);
  `,
};
