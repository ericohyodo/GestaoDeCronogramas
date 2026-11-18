import type { Migracao } from '../migrador';

// Quem está com o aplicativo aberto: cada instância grava um batimento periódico. Vale "online" quem
// bateu há pouco; instâncias que fecharam sem avisar simplesmente deixam de aparecer.
export const migracao0021: Migracao = {
  versao: 21,
  nome: '0021-presenca-de-usuarios',
  sql: `
    CREATE TABLE presenca_usuarios (
      sessao_id       TEXT PRIMARY KEY,
      usuario_id      TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      iniciado_em     TEXT NOT NULL,
      ultimo_batimento TEXT NOT NULL
    );
  `,
};
