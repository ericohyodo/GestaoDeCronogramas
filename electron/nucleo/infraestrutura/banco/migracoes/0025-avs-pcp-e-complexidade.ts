import type { Migracao } from '../migrador';

// PCP: carga de máquina por operação (atual x futura, em %), custos logísticos/investimentos e observações;
// Eng. Produto: complexidade da AV (Alta/Média/Baixa). O layout da fábrica usa os anexos já existentes
// (`av_anexos`, seção 'pcp').
export const migracao0025: Migracao = {
  versao: 25,
  nome: '0025-avs-pcp-e-complexidade',
  sql: `
    ALTER TABLE av_secao_produto ADD COLUMN complexidade TEXT;

    CREATE TABLE av_secao_pcp (
      av_id          TEXT PRIMARY KEY REFERENCES av(id) ON DELETE CASCADE,
      observacoes    TEXT,
      atualizado_em  TEXT,
      atualizado_por TEXT REFERENCES usuarios(id)
    );

    CREATE TABLE av_pcp_cargas (
      id           TEXT PRIMARY KEY,
      av_id        TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      ordem        INTEGER NOT NULL,
      operacao     TEXT NOT NULL,
      maquina      TEXT,
      pecas_hora   REAL,
      carga_atual  REAL,
      carga_futura REAL
    );

    CREATE INDEX idx_av_pcp_cargas ON av_pcp_cargas (av_id, ordem);

    CREATE TABLE av_pcp_custos (
      id        TEXT PRIMARY KEY,
      av_id     TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      ordem     INTEGER NOT NULL,
      descricao TEXT NOT NULL,
      valor     REAL
    );

    CREATE INDEX idx_av_pcp_custos ON av_pcp_custos (av_id, ordem);
  `,
};
