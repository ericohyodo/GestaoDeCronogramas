import type { Migracao } from '../migrador';

// A estrutura do produto passa a ter só quatro tipos (conjunto, componente, embalagem, insumo); o "nível" é
// dado pela posição na árvore. O conjunto principal deixou de ser gravado (o nome vem do desenho do cliente):
// conjuntos na raiz somem e seus filhos sobem para a raiz; 1º e 2º nível viram componentes.
export const migracao0028: Migracao = {
  versao: 28,
  nome: '0028-avs-estrutura-com-componentes',
  sql: `
    CREATE TABLE av_estrutura_produto_nova (
      id         TEXT PRIMARY KEY,
      av_id      TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      pai_id     TEXT REFERENCES av_estrutura_produto_nova(id) ON DELETE CASCADE,
      ordem      INTEGER NOT NULL,
      tipo       TEXT NOT NULL CHECK (tipo IN ('conjunto', 'componente', 'embalagem', 'insumo')),
      codigo     TEXT,
      descricao  TEXT NOT NULL,
      quantidade REAL,
      unidade    TEXT
    );

    INSERT INTO av_estrutura_produto_nova (id, av_id, pai_id, ordem, tipo, codigo, descricao, quantidade, unidade)
    SELECT id, av_id,
           CASE WHEN pai_id IN (SELECT id FROM av_estrutura_produto WHERE tipo = 'conjunto' AND pai_id IS NULL)
                THEN NULL ELSE pai_id END,
           ordem,
           CASE WHEN tipo IN ('nivel1', 'nivel2') THEN 'componente' ELSE tipo END,
           codigo, descricao, quantidade, unidade
    FROM av_estrutura_produto
    WHERE NOT (tipo = 'conjunto' AND pai_id IS NULL)
    ORDER BY ordem;

    DROP TABLE av_estrutura_produto;
    ALTER TABLE av_estrutura_produto_nova RENAME TO av_estrutura_produto;
    CREATE INDEX idx_av_estrutura_produto ON av_estrutura_produto (av_id, ordem);
  `,
};
