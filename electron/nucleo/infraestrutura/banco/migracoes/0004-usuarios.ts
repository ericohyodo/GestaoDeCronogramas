import type { Migracao } from '../migrador';

export const migracao0004: Migracao = {
  versao: 4,
  nome: '0004-usuarios',
  sql: `
    CREATE TABLE usuarios (
      id               TEXT PRIMARY KEY,
      nome             TEXT NOT NULL,
      login            TEXT NOT NULL,
      senha_hash       TEXT NOT NULL,
      perfil           TEXT NOT NULL,
      ativo            INTEGER NOT NULL DEFAULT 1,
      criado_em        TEXT NOT NULL,
      atualizado_em    TEXT NOT NULL,
      ultimo_acesso_em TEXT
    );

    CREATE UNIQUE INDEX idx_usuarios_login ON usuarios (login COLLATE NOCASE);
  `,
};
