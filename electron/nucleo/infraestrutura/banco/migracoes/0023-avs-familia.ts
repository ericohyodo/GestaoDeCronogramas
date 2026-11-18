import type { Migracao } from '../migrador';

// Família do produto da AV (Venturi, Base, Capa…): escolhida numa lista na aba Comercial.
export const migracao0023: Migracao = {
  versao: 23,
  nome: '0023-avs-familia',
  sql: `
    ALTER TABLE av ADD COLUMN familia TEXT;
  `,
};
