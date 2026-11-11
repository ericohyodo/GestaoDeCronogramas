import type { Migracao } from '../migrador';

// Equipe FERKODA no fluxo AV → SD → PRO (11/11/2026):
// - novo campo Departamento e "precisa definir senha" (primeiro acesso: o usuário cadastra e-mail e cria senha);
// - cria os usuários que faltam, sem senha, e coloca no primeiro acesso todos os existentes, menos o "erico";
// - competências por área (Comercial, Eng. Processo, PCP, Mapa de Custo) e papéis de aceite da SD.
// Logins: primeiro nome ou nome.sobrenome. Idempotente nos dados: não duplica quem já existe.
export const migracao0040: Migracao = {
  versao: 40,
  nome: '0040-equipe-e-primeiro-acesso',
  sql: `
    ALTER TABLE usuarios ADD COLUMN departamento TEXT;
    ALTER TABLE usuarios ADD COLUMN precisa_definir_senha INTEGER NOT NULL DEFAULT 0;

    -- Usuários que já existiam: novos logins no padrão nome.sobrenome e Bruna desativada (fora da equipe).
    UPDATE usuarios SET nome = 'Leandro Cruz', login = 'leandro.cruz' WHERE login = 'leandro';
    UPDATE usuarios SET login = 'andre.navarro' WHERE login = 'andrenavarro';
    UPDATE usuarios SET ativo = 0 WHERE login = 'bruna';
    -- Todos (menos o erico) passam pelo primeiro acesso: cadastram e-mail e criam senha nova.
    UPDATE usuarios SET precisa_definir_senha = 1, senha_hash = '!primeiro-acesso', atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE login <> 'erico' AND ativo = 1;

    -- Equipe: cria quem ainda não existe (sem senha) e acerta departamento/perfil de todos.
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Luciana', 'luciana', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Comercial', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'luciana');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Geovanna', 'geovanna', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Comercial', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'geovanna');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Juliana', 'juliana', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Comercial', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'juliana');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Alexandre', 'alexandre', '!primeiro-acesso', 'gestor', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Comercial', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'alexandre');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Allan', 'allan', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Engenharia de Processo', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'allan');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Elimarques', 'elimarques', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Engenharia de Processo', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'elimarques');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Wellington', 'wellington', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Engenharia de Processo', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'wellington');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Anderson', 'anderson', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Engenharia de Processo', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'anderson');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Marcos', 'marcos', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Engenharia de Processo', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'marcos');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Leandro Gomez', 'leandro.gomez', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Engenharia de Processo', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'leandro.gomez');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Gleidson', 'gleidson', '!primeiro-acesso', 'gestor', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Gestão de Projetos', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'gleidson');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Érico Hyodo', 'erico', '!primeiro-acesso', 'administrador', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Gestão de Projetos', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'erico');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Leandro Cruz', 'leandro.cruz', '!primeiro-acesso', 'administrador', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Gestão de Projetos', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'leandro.cruz');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'André Pinto', 'andre.pinto', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Qualidade', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'andre.pinto');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Mateus Rocha', 'mateus.rocha', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Qualidade', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'mateus.rocha');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Evandro Farias', 'evandro.farias', '!primeiro-acesso', 'gestor', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Qualidade', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'evandro.farias');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Thiago', 'thiago', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'PCP', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'thiago');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Fabiana', 'fabiana', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'PCP', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'fabiana');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Luiz', 'luiz', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'PCP', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'luiz');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'Guilherme', 'guilherme', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'PCP', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'guilherme');
    INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, departamento, precisa_definir_senha)
      SELECT lower(hex(randomblob(16))), 'André Navarro', 'andre.navarro', '!primeiro-acesso', 'usuario', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Financeiro', 1
      WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE login = 'andre.navarro');
    UPDATE usuarios SET departamento = 'Comercial' WHERE login IN ('luciana', 'geovanna', 'juliana', 'alexandre');
    UPDATE usuarios SET departamento = 'Engenharia de Processo' WHERE login IN ('allan', 'elimarques', 'wellington', 'anderson', 'marcos', 'leandro.gomez');
    UPDATE usuarios SET departamento = 'Gestão de Projetos' WHERE login IN ('gleidson', 'erico', 'leandro.cruz');
    UPDATE usuarios SET departamento = 'Qualidade' WHERE login IN ('andre.pinto', 'mateus.rocha', 'evandro.farias');
    UPDATE usuarios SET departamento = 'PCP' WHERE login IN ('thiago', 'fabiana', 'luiz', 'guilherme');
    UPDATE usuarios SET departamento = 'Financeiro' WHERE login IN ('andre.navarro');
    UPDATE usuarios SET perfil = 'gestor' WHERE login IN ('alexandre', 'evandro.farias', 'gleidson');

    -- Fluxo AV/SD: competências por área e papéis de aceite da SD.
    INSERT OR IGNORE INTO av_perfis_usuario (usuario_id, papel_av, atualizado_em)
      SELECT id, 'padrao', strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM usuarios WHERE login IN ('luciana', 'geovanna', 'juliana', 'alexandre', 'allan', 'elimarques', 'wellington', 'anderson', 'marcos', 'leandro.gomez', 'gleidson', 'erico', 'leandro.cruz', 'andre.pinto', 'mateus.rocha', 'evandro.farias', 'thiago', 'fabiana', 'luiz', 'guilherme', 'andre.navarro');
    INSERT OR IGNORE INTO av_competencias_usuario (usuario_id, area)
      SELECT id, 'comercial' FROM usuarios WHERE login IN ('luciana', 'geovanna', 'juliana', 'alexandre');
    INSERT OR IGNORE INTO av_competencias_usuario (usuario_id, area)
      SELECT id, 'processo' FROM usuarios WHERE login IN ('allan', 'elimarques', 'wellington', 'anderson', 'marcos', 'leandro.gomez');
    INSERT OR IGNORE INTO av_competencias_usuario (usuario_id, area)
      SELECT id, 'pcp' FROM usuarios WHERE login IN ('thiago', 'fabiana', 'luiz', 'guilherme');
    INSERT OR IGNORE INTO av_competencias_usuario (usuario_id, area)
      SELECT id, 'custo' FROM usuarios WHERE login IN ('andre.navarro');
    INSERT OR IGNORE INTO papeis_especiais (usuario_id, papel)
      SELECT id, 'gerente_engenharia' FROM usuarios WHERE login IN ('leandro.cruz');
    INSERT OR IGNORE INTO papeis_especiais (usuario_id, papel)
      SELECT id, 'gestor_programa' FROM usuarios WHERE login IN ('gleidson', 'erico');
  `,
};
