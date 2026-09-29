import type { Migracao } from '../migrador';

// A estrutura do produto ganha o tipo "matéria-prima". O SQLite não altera CHECK de coluna, então a tabela é
// refeita com os mesmos dados (pai antes dos filhos, pela ordem).
export const migracao0029: Migracao = {
  versao: 29,
  nome: '0029-avs-estrutura-materia-prima',
  sql: `
    CREATE TABLE av_estrutura_produto_nova (
      id         TEXT PRIMARY KEY,
      av_id      TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      pai_id     TEXT REFERENCES av_estrutura_produto_nova(id) ON DELETE CASCADE,
      ordem      INTEGER NOT NULL,
      tipo       TEXT NOT NULL CHECK (tipo IN ('conjunto', 'componente', 'materia_prima', 'embalagem', 'insumo')),
      codigo     TEXT,
      descricao  TEXT NOT NULL,
      quantidade REAL,
      unidade    TEXT
    );

    INSERT INTO av_estrutura_produto_nova (id, av_id, pai_id, ordem, tipo, codigo, descricao, quantidade, unidade)
    SELECT id, av_id, pai_id, ordem, tipo, codigo, descricao, quantidade, unidade
    FROM av_estrutura_produto
    ORDER BY ordem;

    DROP TABLE av_estrutura_produto;
    ALTER TABLE av_estrutura_produto_nova RENAME TO av_estrutura_produto;
    CREATE INDEX idx_av_estrutura_produto ON av_estrutura_produto (av_id, ordem);
  `,
};
