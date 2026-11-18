import type { Migracao } from '../migrador';

// Página "Meu perfil": cada usuário preenche os próprios dados de contato e uma foto. Fica fora da tabela
// `usuarios` (credenciais e perfil de acesso, que só o administrador mexe). A foto é pequena (a tela reduz
// para 256 px em JPEG antes de enviar) e vai em base64 no próprio banco, para seguir junto com os backups.
export const migracao0052: Migracao = {
  versao: 52,
  nome: '0052-perfil-dos-usuarios',
  sql: `
    CREATE TABLE usuarios_perfil (
      usuario_id    TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      cargo         TEXT,
      ramal         TEXT,
      celular       TEXT,
      sobre         TEXT,
      foto_base64   TEXT,
      foto_mime     TEXT CHECK (foto_mime IS NULL OR foto_mime IN ('image/jpeg', 'image/png')),
      atualizado_em TEXT NOT NULL
    );
  `,
};
