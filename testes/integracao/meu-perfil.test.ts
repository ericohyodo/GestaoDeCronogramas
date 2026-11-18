/** Meu perfil: o próprio usuário mantém contato, cargo, "sobre mim" e foto; nunca os dados de outra pessoa. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ObterMeuPerfil, SalvarMeuPerfil } from '../../electron/modulos/usuarios/aplicacao/casos-de-uso/meu-perfil';
import { Sessao } from '../../electron/modulos/usuarios/aplicacao/sessao';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioPerfilPessoalSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-perfil-pessoal-sqlite';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { RelogioFixo } from '../dubles/dubles';

const FOTO = { mime: 'image/jpeg' as const, base64: '/9j/4AAQSkZJRg==' };

describe('meu perfil', () => {
  let db: BancoDeDados;
  let sessao: Sessao;
  let salvar: SalvarMeuPerfil;
  let obter: ObterMeuPerfil;

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const relogio = new RelogioFixo();
    const usuarios = new RepositorioUsuariosSqlite(db);
    const ana = Usuario.criar({ id: 'u1', nome: 'Ana Lima', login: 'ana', senhaHash: 'h', perfil: 'usuario', agora: relogio.agora() });
    await usuarios.salvar(ana);
    sessao = new Sessao();
    sessao.abrir(ana);
    const perfis = new RepositorioPerfilPessoalSqlite(db);
    salvar = new SalvarMeuPerfil(sessao, usuarios, perfis, relogio);
    obter = new ObterMeuPerfil(sessao, perfis);
  });

  afterEach(() => db.close());

  it('grava contato, cargo, "sobre mim", e-mail, departamento e foto de quem está logado', async () => {
    expect(await obter.executar()).toMatchObject({ nome: 'Ana Lima', cargo: null, foto: null });
    await salvar.executar({
      email: 'ana@ferkoda.com.br',
      departamento: 'PCP',
      cargo: 'Analista de PCP',
      ramal: '2154',
      celular: '(11) 98888-7777',
      sobre: 'Carga de máquina e sequenciamento.',
      foto: FOTO,
    });
    const lido = await obter.executar();
    expect(lido).toMatchObject({
      email: 'ana@ferkoda.com.br',
      departamento: 'PCP',
      cargo: 'Analista de PCP',
      ramal: '2154',
      foto: FOTO,
    });
    // A sessão passa a refletir o e-mail novo.
    expect(sessao.usuarioAtual?.email).toBe('ana@ferkoda.com.br');

    // Sem `foto` mantém; `null` remove.
    await salvar.executar({ cargo: 'Coordenadora de PCP' });
    expect((await obter.executar()).foto).toEqual(FOTO);
    await salvar.executar({ foto: null });
    expect((await obter.executar()).foto).toBeNull();
  });

  it('recusa ramal com letras e e-mail inválido', async () => {
    await expect(salvar.executar({ ramal: 'abc' })).rejects.toThrow(/ramal/);
    await expect(salvar.executar({ email: 'sem-arroba' })).rejects.toThrow();
  });

  it('exige alguém logado', async () => {
    sessao.encerrar();
    await expect(obter.executar()).rejects.toThrow(/Entre/);
  });
});
