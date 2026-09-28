import type { Migracao } from '../migrador';

// Anexos reais (desenhos, PDFs, fotos) por AV e por área — os arquivos ficam em disco, ao lado do
// banco (`anexos-avs/<avId>/`), e esta tabela só guarda os metadados + o caminho relativo.
export const migracao0017: Migracao = {
  versao: 17,
  nome: '0017-avs-anexos',
  sql: `
    CREATE TABLE av_anexos (
      id              TEXT PRIMARY KEY,
      av_id           TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      secao           TEXT NOT NULL CHECK (secao IN ('comercial', 'produto', 'processo', 'pcp', 'custo')),
      nome_arquivo    TEXT NOT NULL,
      nome_armazenado TEXT NOT NULL,
      tipo_mime       TEXT,
      tamanho_bytes   INTEGER NOT NULL,
      usuario_id      TEXT REFERENCES usuarios(id),
      criado_em       TEXT NOT NULL
    );

    CREATE INDEX idx_av_anexos ON av_anexos (av_id, secao, criado_em);
  `,
};
