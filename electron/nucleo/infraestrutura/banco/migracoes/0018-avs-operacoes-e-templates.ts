import type { Migracao } from '../migrador';

// Sequência de operações da Eng. Processo (alimenta o Mapa de Custo) e templates reutilizáveis
// dessas sequências. Os itens do template ficam num JSON: são copiados para a AV ao carregar,
// então não precisam de integridade referencial com nada.
export const migracao0018: Migracao = {
  versao: 18,
  nome: '0018-avs-operacoes-e-templates',
  sql: `
    CREATE TABLE av_operacoes (
      id         TEXT PRIMARY KEY,
      av_id      TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      ordem      INTEGER NOT NULL,
      descricao  TEXT NOT NULL,
      maquina    TEXT,
      pecas_hora REAL
    );

    CREATE INDEX idx_av_operacoes ON av_operacoes (av_id, ordem);

    CREATE TABLE av_templates (
      id         TEXT PRIMARY KEY,
      tipo       TEXT NOT NULL CHECK (tipo IN ('operacoes', 'custo_processo')),
      nome       TEXT NOT NULL,
      itens      TEXT NOT NULL,
      usuario_id TEXT REFERENCES usuarios(id),
      criado_em  TEXT NOT NULL,
      UNIQUE (tipo, nome COLLATE NOCASE)
    );
  `,
};
