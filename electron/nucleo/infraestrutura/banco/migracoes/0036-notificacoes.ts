import type { Migracao } from '../migrador';

// Notificações internas por usuário (sino na barra superior). Também são a base do futuro status report
// por e-mail: o resumo vai ler daqui o que cada pessoa recebeu.
export const migracao0036: Migracao = {
  versao: 36,
  nome: '0036-notificacoes',
  sql: `
    CREATE TABLE notificacoes (
      id         TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo       TEXT NOT NULL,
      titulo     TEXT NOT NULL,
      mensagem   TEXT NOT NULL,
      link       TEXT,
      criada_em  TEXT NOT NULL,
      lida_em    TEXT
    );
    CREATE INDEX idx_notificacoes_usuario ON notificacoes (usuario_id, lida_em, criada_em);
  `,
};
