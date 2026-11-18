import type { Migracao } from '../migrador';

// Contatos da AV como lista (nome, área, telefone, e-mail), no lugar dos quatro campos fixos
// (contato comercial/técnico, e-mail e telefone comerciais). As colunas antigas ficam na tabela
// `av`, sem uso; o que já estava preenchido é copiado para a lista.
export const migracao0022: Migracao = {
  versao: 22,
  nome: '0022-avs-contatos',
  sql: `
    CREATE TABLE av_contatos (
      id       TEXT PRIMARY KEY,
      av_id    TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      ordem    INTEGER NOT NULL,
      nome     TEXT NOT NULL,
      area     TEXT,
      telefone TEXT,
      email    TEXT
    );

    CREATE INDEX idx_av_contatos ON av_contatos (av_id, ordem);

    INSERT INTO av_contatos (id, av_id, ordem, nome, area, telefone, email)
    SELECT lower(hex(randomblob(16))), id, 0,
           COALESCE(NULLIF(TRIM(contato_comercial), ''), 'Contato comercial'),
           'Comercial', NULLIF(TRIM(fone_comercial), ''), NULLIF(TRIM(email_comercial), '')
    FROM av
    WHERE COALESCE(TRIM(contato_comercial), '') <> ''
       OR COALESCE(TRIM(fone_comercial), '') <> ''
       OR COALESCE(TRIM(email_comercial), '') <> '';

    INSERT INTO av_contatos (id, av_id, ordem, nome, area, telefone, email)
    SELECT lower(hex(randomblob(16))), id, 1, TRIM(contato_tecnico), 'Técnico', NULL, NULL
    FROM av
    WHERE COALESCE(TRIM(contato_tecnico), '') <> '';
  `,
};
