import type { Migracao } from '../migrador';

// E-mail do usuário: base para o futuro status report automático (notificações e próximas atividades).
export const migracao0037: Migracao = {
  versao: 37,
  nome: '0037-usuarios-email',
  sql: `
    ALTER TABLE usuarios ADD COLUMN email TEXT;
  `,
};
