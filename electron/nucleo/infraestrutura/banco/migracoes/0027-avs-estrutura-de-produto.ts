import type { Migracao } from '../migrador';

// Estrutura do produto da AV em árvore: conjunto → 1º nível → 2º nível, com embalagens e insumos nos níveis.
// Cada linha aponta para o pai (`pai_id`); apagar um item apaga tudo o que está abaixo dele.
export const migracao0027: Migracao = {
  versao: 27,
  nome: '0027-avs-estrutura-de-produto',
  sql: `
    CREATE TABLE av_estrutura_produto (
      id         TEXT PRIMARY KEY,
      av_id      TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      pai_id     TEXT REFERENCES av_estrutura_produto(id) ON DELETE CASCADE,
      ordem      INTEGER NOT NULL,
      tipo       TEXT NOT NULL CHECK (tipo IN ('conjunto', 'nivel1', 'nivel2', 'embalagem', 'insumo')),
      codigo     TEXT,
      descricao  TEXT NOT NULL,
      quantidade REAL,
      unidade    TEXT
    );

    CREATE INDEX idx_av_estrutura_produto ON av_estrutura_produto (av_id, ordem);
  `,
};
