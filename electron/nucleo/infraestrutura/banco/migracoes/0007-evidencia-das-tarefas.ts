import type { Migracao } from '../migrador';

// Texto livre que comprova a entrega da tarefa (ex.: "PPAP aprovado, e-mail de 12/10").
export const migracao0007: Migracao = {
  versao: 7,
  nome: '0007-evidencia-das-tarefas',
  sql: `
    ALTER TABLE tarefas ADD COLUMN evidencia TEXT;
  `,
};
