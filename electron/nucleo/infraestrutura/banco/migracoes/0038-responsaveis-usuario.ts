import type { Migracao } from '../migrador';

// Vínculo Recurso (responsável pelas tarefas) ↔ Usuário do sistema: é por ele que as notificações de
// tarefas chegam ao sino da pessoa certa (e, no futuro, o status report por e-mail). Um usuário responde
// por no máximo um recurso. Excluir o usuário só desfaz o vínculo.
export const migracao0038: Migracao = {
  versao: 38,
  nome: '0038-responsaveis-usuario',
  sql: `
    ALTER TABLE responsaveis ADD COLUMN usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL;
    CREATE UNIQUE INDEX idx_responsaveis_usuario ON responsaveis (usuario_id) WHERE usuario_id IS NOT NULL;
  `,
};
