import type { Migracao } from '../migrador';

// Parecer da Engenharia no aceite da SD (observações, inconsistências encontradas na evidência do PO…).
// Na devolução ao Comercial o parecer é o motivo, que já tinha coluna própria (devolucao_motivo).
export const migracao0035: Migracao = {
  versao: 35,
  nome: '0035-sd-parecer-do-aceite',
  sql: `
    ALTER TABLE sd ADD COLUMN parecer_aceite TEXT;
  `,
};
