import type { Migracao } from '../migrador';

// Papéis organizacionais que dão o aceite da SD (passagem de bastão Comercial → Engenharia):
// Gerente de Engenharia e Gestor de Programa. Atribuídos pelo administrador na tela de Usuários.
export const migracao0032: Migracao = {
  versao: 32,
  nome: '0032-papeis-especiais',
  sql: `
    CREATE TABLE papeis_especiais (
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      papel      TEXT NOT NULL CHECK (papel IN ('gerente_engenharia', 'gestor_programa')),
      PRIMARY KEY (usuario_id, papel)
    );
  `,
};
