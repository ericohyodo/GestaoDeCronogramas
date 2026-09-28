import type { Migracao } from '../migrador';

// Perfil do módulo de AVs, à parte do perfil global de usuários: quem não tem linha aqui
// se comporta como papel_av='padrao' sem nenhuma competência (só enxerga, não edita nada).
export const migracao0011: Migracao = {
  versao: 11,
  nome: '0011-avs-perfil-usuario',
  sql: `
    CREATE TABLE av_perfis_usuario (
      usuario_id    TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      papel_av      TEXT NOT NULL DEFAULT 'padrao' CHECK (papel_av IN ('padrao', 'visualizador')),
      atualizado_em TEXT NOT NULL
    );

    CREATE TABLE av_competencias_usuario (
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      area       TEXT NOT NULL CHECK (area IN ('comercial', 'produto', 'processo', 'pcp', 'custo')),
      PRIMARY KEY (usuario_id, area)
    );
  `,
};
