import type { Migracao } from '../migrador';

export const migracao0003: Migracao = {
  versao: 3,
  nome: '0003-preferencias',
  sql: `
    CREATE TABLE preferencias (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `,
};
