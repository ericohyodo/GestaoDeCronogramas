/** Migração 0040 (equipe FERKODA) e primeiro acesso: o usuário cadastra e-mail e cria a senha. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConcluirPrimeiroAcesso } from '../../electron/modulos/usuarios/aplicacao/casos-de-uso/concluir-primeiro-acesso';
import { Entrar } from '../../electron/modulos/usuarios/aplicacao/casos-de-uso/entrar';
import { Sessao } from '../../electron/modulos/usuarios/aplicacao/sessao';
import { HashDeSenhaScrypt } from '../../electron/modulos/usuarios/infraestrutura/hash-de-senha-scrypt';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../../electron/nucleo/infraestrutura/banco/migracoes';
import { RelogioFixo } from '../dubles/dubles';

describe('equipe e primeiro acesso', () => {
  let db: BancoDeDados;

  beforeEach(() => {
    db = abrirConexao(':memory:');
    // Banco que já existia (até a 0039) com alguns usuários com senha, como o de produção.
    executarMigracoes(db, MIGRACOES.filter((m) => m.versao <= 39));
    const inserir = db.prepare(
      `INSERT INTO usuarios (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em)
       VALUES (?, ?, ?, 'hash-antigo', ?, 1, '2026-01-01', '2026-01-01')`,
    );
    inserir.run('u-erico', 'Érico Hyodo', 'erico', 'administrador');
    inserir.run('u-leandro', 'Leandro', 'leandro', 'administrador');
    inserir.run('u-navarro', 'André Navarro', 'andrenavarro', 'usuario');
    inserir.run('u-bruna', 'Bruna', 'bruna', 'usuario');
    inserir.run('u-alexandre', 'Alexandre', 'alexandre', 'administrador');
    executarMigracoes(db, MIGRACOES);
  });

  afterEach(() => db.close());

  const usuario = (login: string) =>
    db.prepare('SELECT * FROM usuarios WHERE login = ?').get(login) as Record<string, unknown> | undefined;

  it('cadastra a equipe, renomeia logins e preserva o erico', () => {
    expect(db.prepare('SELECT COUNT(*) FROM usuarios WHERE ativo = 1').pluck().get()).toBe(21);
    expect(usuario('erico')).toMatchObject({ senha_hash: 'hash-antigo', precisa_definir_senha: 0, departamento: 'Gestão de Projetos' });
    expect(usuario('leandro.cruz')).toMatchObject({ id: 'u-leandro', nome: 'Leandro Cruz', perfil: 'administrador', precisa_definir_senha: 1 });
    expect(usuario('andre.navarro')).toMatchObject({ id: 'u-navarro', departamento: 'Financeiro' });
    expect(usuario('alexandre')).toMatchObject({ perfil: 'gestor', departamento: 'Comercial' });
    expect(usuario('bruna')).toMatchObject({ ativo: 0 });
    expect(usuario('juliana')).toMatchObject({ precisa_definir_senha: 1, departamento: 'Comercial' });

    const papeis = db
      .prepare('SELECT u.login, p.papel FROM papeis_especiais p JOIN usuarios u ON u.id = p.usuario_id ORDER BY u.login')
      .all();
    expect(papeis).toEqual([
      { login: 'erico', papel: 'gestor_programa' },
      { login: 'gleidson', papel: 'gestor_programa' },
      { login: 'leandro.cruz', papel: 'gerente_engenharia' },
    ]);
    const comercial = db
      .prepare("SELECT u.login FROM av_competencias_usuario c JOIN usuarios u ON u.id = c.usuario_id WHERE c.area = 'comercial' ORDER BY 1")
      .pluck()
      .all();
    expect(comercial).toEqual(['alexandre', 'geovanna', 'juliana', 'luciana']);
  });

  it('no primeiro acesso a pessoa cadastra e-mail e senha e depois entra normalmente', async () => {
    const repositorio = new RepositorioUsuariosSqlite(db);
    const hash = new HashDeSenhaScrypt();
    const relogio = new RelogioFixo();
    const entrar = new Entrar(repositorio, hash, new Sessao(), relogio);

    await expect(entrar.executar({ login: 'luciana', senha: '' })).rejects.toMatchObject({ codigo: 'PRIMEIRO_ACESSO' });

    const concluir = new ConcluirPrimeiroAcesso(repositorio, hash, new Sessao(), relogio);
    await expect(concluir.executar({ login: 'luciana', email: 'x', senha: 'senha-forte-1' })).rejects.toThrow(/E-mail/);
    const sessao = await concluir.executar({ login: 'luciana', email: 'Luciana@Ferkoda.com.br', senha: 'senha-forte-1' });
    expect(sessao.usuario).toMatchObject({ login: 'luciana', email: 'luciana@ferkoda.com.br', precisaDefinirSenha: false });

    await expect(concluir.executar({ login: 'luciana', email: 'a@b.com', senha: 'outra-senha-1' })).rejects.toThrow(
      /não está aguardando/,
    );
    await expect(entrar.executar({ login: 'luciana', senha: 'errada-123' })).rejects.toThrow();
    expect((await entrar.executar({ login: 'luciana', senha: 'senha-forte-1' })).usuario?.nome).toBe('Luciana');
  });
});
