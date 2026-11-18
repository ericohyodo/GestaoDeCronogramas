import type { Migracao } from '../migrador';

// Agente do Chat com IA (Projetos): a IA não altera nada sozinha. Ela registra uma proposta (lista de
// alterações + como cada tarefa estava) e a pessoa decide: Aplicar ou Descartar. A fala da IA que trouxe a
// proposta aponta para ela, para o histórico mostrar o cartão com a decisão.
export const migracao0043: Migracao = {
  versao: 43,
  nome: '0043-ia-propostas',
  sql: `
    CREATE TABLE ia_propostas (
      id              TEXT PRIMARY KEY,
      usuario_id      TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      cronograma_id   TEXT NOT NULL,
      cronograma_nome TEXT NOT NULL,
      resumo          TEXT NOT NULL,
      operacoes       TEXT NOT NULL,
      esperado        TEXT NOT NULL,
      itens           TEXT NOT NULL,
      situacao        TEXT NOT NULL CHECK (situacao IN ('pendente', 'aplicada', 'descartada', 'desatualizada')),
      criada_em       TEXT NOT NULL,
      decidida_em     TEXT,
      motivo          TEXT
    );
    CREATE INDEX idx_ia_propostas_usuario ON ia_propostas (usuario_id, criada_em);

    ALTER TABLE ia_conversa_mensagens ADD COLUMN proposta_id TEXT REFERENCES ia_propostas(id) ON DELETE SET NULL;
  `,
};
