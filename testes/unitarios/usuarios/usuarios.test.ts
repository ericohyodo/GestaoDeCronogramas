import { beforeEach, describe, expect, it } from 'vitest';
import { CriarPrimeiroUsuario } from '../../../electron/modulos/usuarios/aplicacao/casos-de-uso/criar-primeiro-usuario';
import { Entrar } from '../../../electron/modulos/usuarios/aplicacao/casos-de-uso/entrar';
import {
  AlterarSenha,
  AtualizarUsuario,
  CriarUsuario,
  ExcluirUsuario,
} from '../../../electron/modulos/usuarios/aplicacao/casos-de-uso/gerenciar-usuarios';
import { Sessao } from '../../../electron/modulos/usuarios/aplicacao/sessao';
import { permissoesDoPerfil } from '../../../electron/modulos/usuarios/dominio/perfil';
import { ErroDeValidacao } from '../../../electron/nucleo/dominio/erro-de-dominio';
import {
  GeradorDeIdSequencial,
  HashDeSenhaFalso,
  RelogioFixo,
  RepositorioUsuariosEmMemoria,
} from '../../dubles/dubles';

describe('Perfis', () => {
  it('cada perfil acumula as permissões do anterior', () => {
    expect(permissoesDoPerfil('visualizador')).toEqual(['leitura']);
    expect(permissoesDoPerfil('usuario')).toEqual(['leitura', 'tarefas']);
    expect(permissoesDoPerfil('gestor')).toEqual(['leitura', 'tarefas', 'planejamento']);
    expect(permissoesDoPerfil('administrador')).toEqual([
      'leitura',
      'tarefas',
      'planejamento',
      'administracao',
    ]);
  });
});

describe('Login e gestão de usuários', () => {
  let repositorio: RepositorioUsuariosEmMemoria;
  let sessao: Sessao;
  let relogio: RelogioFixo;
  let hash: HashDeSenhaFalso;
  let entrar: Entrar;

  const primeiroAcesso = () =>
    new CriarPrimeiroUsuario(
      repositorio,
      hash,
      sessao,
      relogio,
      new GeradorDeIdSequencial('u'),
    ).executar({ nome: 'Erico', login: 'erico', senha: 'senha-forte-1' });

  beforeEach(() => {
    repositorio = new RepositorioUsuariosEmMemoria();
    sessao = new Sessao();
    relogio = new RelogioFixo();
    hash = new HashDeSenhaFalso();
    entrar = new Entrar(repositorio, hash, sessao, relogio);
  });

  it('o primeiro acesso cria um administrador e já abre a sessão', async () => {
    const dto = await primeiroAcesso();

    expect(dto.usuario).toMatchObject({ login: 'erico', perfil: 'administrador', ativo: true });
    expect(dto.permissoes).toContain('administracao');
    expect(dto.precisaConfigurar).toBe(false);
    expect(sessao.autenticado()).toBe(true);
  });

  it('só permite o primeiro acesso com o banco vazio', async () => {
    await primeiroAcesso();
    await expect(primeiroAcesso()).rejects.toThrow(/já existe usuário/i);
  });

  it('exige senha de pelo menos 8 caracteres e login em formato válido', async () => {
    const criar = new CriarPrimeiroUsuario(
      repositorio,
      hash,
      sessao,
      relogio,
      new GeradorDeIdSequencial('u'),
    );
    await expect(
      criar.executar({ nome: 'Curta', login: 'ana', senha: '1234' }),
    ).rejects.toThrow(ErroDeValidacao);
    await expect(
      criar.executar({ nome: 'Login ruim', login: 'a b', senha: 'senha-forte-1' }),
    ).rejects.toThrow(ErroDeValidacao);
  });

  it('entra com a senha correta e recusa a errada sem dizer qual campo falhou', async () => {
    await primeiroAcesso();
    sessao.encerrar();

    await expect(entrar.executar({ login: 'erico', senha: 'errada' })).rejects.toThrow(
      'Usuário ou senha incorretos.',
    );
    await expect(entrar.executar({ login: 'ninguem', senha: 'qualquer' })).rejects.toThrow(
      'Usuário ou senha incorretos.',
    );

    // O login não diferencia maiúsculas de minúsculas.
    const dto = await entrar.executar({ login: 'ERICO', senha: 'senha-forte-1' });
    expect(dto.usuario?.login).toBe('erico');
    expect(dto.usuario?.ultimoAcessoEm).toBe(relogio.instante.toISOString());
  });

  it('bloqueia por 30 segundos depois de cinco tentativas erradas', async () => {
    await primeiroAcesso();

    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      await expect(entrar.executar({ login: 'erico', senha: 'errada' })).rejects.toThrow();
    }
    await expect(entrar.executar({ login: 'erico', senha: 'senha-forte-1' })).rejects.toThrow(
      /muitas tentativas/i,
    );

    relogio.instante = new Date(relogio.instante.getTime() + 31_000);
    await expect(entrar.executar({ login: 'erico', senha: 'senha-forte-1' })).resolves.toMatchObject(
      { usuario: { login: 'erico' } },
    );
  });

  it('recusa usuário desativado', async () => {
    await primeiroAcesso();
    const admin = [...repositorio.itens.values()][0]!;
    await new CriarUsuario(repositorio, hash, relogio, new GeradorDeIdSequencial('v')).executar({
      nome: 'Visitante',
      login: 'visitante',
      senha: 'senha-forte-2',
      perfil: 'visualizador',
    });
    const visitante = await repositorio.obterPorLogin('visitante');
    await new AtualizarUsuario(repositorio, relogio).executar({
      id: visitante!.id,
      ativo: false,
    });

    await expect(entrar.executar({ login: 'visitante', senha: 'senha-forte-2' })).rejects.toThrow(
      /desativado/i,
    );
    expect(admin.ativo).toBe(true);
  });

  it('protege o último administrador ativo', async () => {
    await primeiroAcesso();
    const admin = [...repositorio.itens.values()][0]!;

    await expect(
      new AtualizarUsuario(repositorio, relogio).executar({ id: admin.id, perfil: 'usuario' }),
    ).rejects.toThrow(/único administrador/i);
    await expect(
      new ExcluirUsuario(repositorio, sessao).executar(admin.id),
    ).rejects.toThrow(/próprio usuário/i);
  });

  it('exige a senha atual para trocar a própria senha', async () => {
    await primeiroAcesso();
    const admin = [...repositorio.itens.values()][0]!;
    const alterar = new AlterarSenha(repositorio, hash, sessao, relogio);

    await expect(
      alterar.executar({ id: admin.id, senhaAtual: 'errada', novaSenha: 'outra-senha-9' }),
    ).rejects.toThrow('Usuário ou senha incorretos.');

    await alterar.executar({
      id: admin.id,
      senhaAtual: 'senha-forte-1',
      novaSenha: 'outra-senha-9',
    });
    sessao.encerrar();
    await expect(entrar.executar({ login: 'erico', senha: 'outra-senha-9' })).resolves.toBeTruthy();
  });
});
