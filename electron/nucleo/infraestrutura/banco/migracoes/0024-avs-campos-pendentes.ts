import type { Migracao } from '../migrador';

// Campos que a AV recebeu "para preencher à mão" ao herdar dados do grupo (o produto é outro).
// NULL = nunca herdou; lista vazia = herdou e tudo já foi preenchido. Guardado como JSON.
export const migracao0024: Migracao = {
  versao: 24,
  nome: '0024-avs-campos-pendentes',
  sql: `
    ALTER TABLE av ADD COLUMN campos_pendentes TEXT;
  `,
};
