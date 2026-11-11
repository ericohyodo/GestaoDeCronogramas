import type { Migracao } from '../migrador';

// Histórico do Chat com IA: conversas de cada usuário, separadas por escopo (Projetos e AVs). Cada pessoa
// só vê as próprias; conversas sem uso há mais de 90 dias são apagadas automaticamente (rotina do app).
export const migracao0041: Migracao = {
  versao: 41,
  nome: '0041-ia-conversas',
  sql: `
    CREATE TABLE ia_conversas (
      id            TEXT PRIMARY KEY,
      usuario_id    TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      escopo        TEXT NOT NULL CHECK (escopo IN ('projetos', 'avs')),
      titulo        TEXT NOT NULL,
      criada_em     TEXT NOT NULL,
      atualizada_em TEXT NOT NULL
    );
    CREATE INDEX idx_ia_conversas_usuario ON ia_conversas (usuario_id, escopo, atualizada_em);
    CREATE INDEX idx_ia_conversas_uso ON ia_conversas (atualizada_em);

    CREATE TABLE ia_conversa_mensagens (
      id          TEXT PRIMARY KEY,
      conversa_id TEXT NOT NULL REFERENCES ia_conversas(id) ON DELETE CASCADE,
      ordem       INTEGER NOT NULL,
      papel       TEXT NOT NULL CHECK (papel IN ('usuario', 'ia')),
      texto       TEXT NOT NULL,
      modelo      TEXT,
      criada_em   TEXT NOT NULL
    );
    CREATE INDEX idx_ia_conversa_mensagens ON ia_conversa_mensagens (conversa_id, ordem);
  `,
};
