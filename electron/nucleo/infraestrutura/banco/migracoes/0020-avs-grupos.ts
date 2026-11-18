import type { Migracao } from '../migrador';

// Grupo de AVs: reúne AVs que compartilham propriedades (cliente, contatos, equipe…) para que o
// preenchimento de uma possa ser aplicado às demais. Uma AV pertence a no máximo um grupo.
export const migracao0020: Migracao = {
  versao: 20,
  nome: '0020-avs-grupos',
  sql: `
    CREATE TABLE av_grupo (
      id         TEXT PRIMARY KEY,
      nome       TEXT NOT NULL COLLATE NOCASE UNIQUE,
      criado_por TEXT REFERENCES usuarios(id),
      criado_em  TEXT NOT NULL
    );

    ALTER TABLE av ADD COLUMN grupo_id TEXT REFERENCES av_grupo(id) ON DELETE SET NULL;
    CREATE INDEX idx_av_grupo ON av (grupo_id);
  `,
};
