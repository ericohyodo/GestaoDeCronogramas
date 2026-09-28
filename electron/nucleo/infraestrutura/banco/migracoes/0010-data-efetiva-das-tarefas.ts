import type { Migracao } from '../migrador';

// Data (AAAA-MM-DD) em que a tarefa foi de fato concluída, separada do período planejado:
// adiantar ou atrasar não mexe mais nas datas previstas.
export const migracao0010: Migracao = {
  versao: 10,
  nome: '0010-data-efetiva-das-tarefas',
  sql: `
    ALTER TABLE tarefas ADD COLUMN data_efetiva TEXT;
  `,
};
