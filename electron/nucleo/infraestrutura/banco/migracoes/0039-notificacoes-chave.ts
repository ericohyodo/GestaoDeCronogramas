import type { Migracao } from '../migrador';

// Avisos de rotina (prazo vencendo/atrasado) saem uma única vez por chave (ex.: tarefa + término), mesmo com
// vários PCs rodando a verificação. Migração própria: a 0038 já tinha sido aplicada sem esta coluna
// (migração aplicada nunca é editada; corrige-se com uma nova).
export const migracao0039: Migracao = {
  versao: 39,
  nome: '0039-notificacoes-chave',
  sql: `
    ALTER TABLE notificacoes ADD COLUMN chave TEXT;
    CREATE INDEX idx_notificacoes_chave ON notificacoes (usuario_id, tipo, chave) WHERE chave IS NOT NULL;
  `,
};
