import type { Migracao } from '../migrador';

// Solicitação de Desenvolvimento (SD): nasce de uma AV finalizada e sempre acompanha o número dela
// (AV 0007-26 → SD 0007-26 → PRO 0007-26). Uma AV tem no máximo uma SD.
export const migracao0019: Migracao = {
  versao: 19,
  nome: '0019-sds',
  sql: `
    CREATE TABLE sd (
      id         TEXT PRIMARY KEY,
      av_id      TEXT NOT NULL UNIQUE REFERENCES av(id),
      numero     TEXT NOT NULL UNIQUE,
      status     TEXT NOT NULL CHECK (status IN ('pre_sd', 'aberta', 'fechada', 'cancelada')),
      criado_por TEXT REFERENCES usuarios(id),
      criado_em  TEXT NOT NULL
    );
  `,
};
