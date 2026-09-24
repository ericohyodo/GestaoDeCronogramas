import type { Migracao } from '../migrador';

// Configuração da análise com IA: chave da API (cifrada), salt da cifra e modelo escolhido.
export const migracao0008: Migracao = {
  versao: 8,
  nome: '0008-configuracao-ia',
  sql: `
    CREATE TABLE ia_configuracao (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `,
};
