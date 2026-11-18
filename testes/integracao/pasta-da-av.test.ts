/** Pasta da AV no Windows: raiz configurada, criação junto com a AV, visualizador e proteção de caminho. */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import {
  CriarPastaDaAv,
  type DependenciasPastaDaAv,
  ListarArquivosDaPasta,
  SalvarPastaConfig,
} from '../../electron/modulos/avs/aplicacao/casos-de-uso/pasta-da-av';
import type { ConsultaDeUsuarios, UsuarioAtualAv } from '../../electron/modulos/avs/aplicacao/portas';
import { nomeDaPastaDaAv, validarCaminhoRelativo, validarPastaRaiz } from '../../electron/modulos/avs/dominio/pasta-da-av';
import { GerenciadorDePastasFs, RepositorioConfigPastaDasAvsSqlite } from '../../electron/modulos/avs/infraestrutura/pastas-fs';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('regras do nome e do caminho', () => {
  it('nome = número - cliente - descrição, sem caracteres proibidos no Windows', () => {
    expect(nomeDaPastaDaAv('AV 26-036', 'Electrolux', 'Suporte do queimador')).toBe('AV 26-036 - Electrolux - Suporte do queimador');
    expect(nomeDaPastaDaAv('AV 26-037', null, 'Tubo 1/2" : rev.')).toBe('AV 26-037 - Tubo 1 2 rev');
    expect(nomeDaPastaDaAv('AV 26-038', 'X', 'a'.repeat(300)).length).toBeLessThanOrEqual(120);
  });

  it('raiz precisa ser caminho completo (disco ou rede)', () => {
    expect(validarPastaRaiz('E:\\COMERCIAL - AV\\AVs\\')).toBe('E:\\COMERCIAL - AV\\AVs');
    expect(validarPastaRaiz('\\\\servidor\\comercial\\AVs')).toBe('\\\\servidor\\comercial\\AVs');
    expect(validarPastaRaiz('  ')).toBeNull();
    expect(() => validarPastaRaiz('AVs')).toThrow(/caminho completo/);
  });

  it('caminho relativo do visualizador não sai da pasta', () => {
    expect(validarCaminhoRelativo('E-mails\\pedido.msg')).toBe('E-mails\\pedido.msg');
    for (const ruim of ['..\\outra', 'a\\..\\..\\b', 'C:\\Windows', '']) expect(() => validarCaminhoRelativo(ruim)).toThrow();
  });
});

describe('pasta da AV', () => {
  let db: BancoDeDados;
  let raiz: string;
  let logado: UsuarioAtualAv;
  let deps: DependenciasPastaDaAv;
  let criarAv: CriarAv;

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    raiz = mkdtempSync(path.join(tmpdir(), 'pastas-avs-'));
    const relogio = new RelogioFixo();
    await new RepositorioUsuariosSqlite(db).salvar(
      Usuario.criar({ id: 'u1', nome: 'Erico', login: 'erico', senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }),
    );
    logado = { id: 'u1', nome: 'Erico', perfil: 'administrador' };
    const consulta: ConsultaDeUsuarios = {
      usuarioAtual: () => logado,
      listarAtivos: async () => [{ id: 'u1', nome: 'Erico' }],
      obterPerfilGlobal: async () => 'administrador',
    };
    const avs = new RepositorioAvsSqlite(db);
    const autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    deps = {
      avs,
      config: new RepositorioConfigPastaDasAvsSqlite(db),
      pastas: new GerenciadorDePastasFs(),
      autorizacao,
      usuarios: consulta,
      relogio,
    };
    criarAv = new CriarAv(avs, relogio, new GeradorDeIdSequencial('a'), consulta, autorizacao, undefined, undefined, null, deps);
  });

  afterEach(() => {
    db.close();
    rmSync(raiz, { recursive: true, force: true });
  });

  it('sem raiz configurada, a AV nasce sem pasta; depois de configurar, o botão cria', async () => {
    const av = await criarAv.executar({ descricao: 'Suporte', cliente: 'Electrolux' });
    expect(av.pasta).toBeNull();
    await expect(new CriarPastaDaAv(deps).executar(av.id)).rejects.toThrow(/Configurações/);

    await new SalvarPastaConfig(deps).executar({ pastaRaiz: raiz });
    const comPasta = await new CriarPastaDaAv(deps).executar(av.id);
    expect(comPasta.pasta).toBe(path.join(raiz, `${av.numero} - Electrolux - Suporte`));
  });

  it('com raiz configurada, cria a pasta junto com a AV e o visualizador lista o conteúdo', async () => {
    await new SalvarPastaConfig(deps).executar({ pastaRaiz: raiz });
    const av = await criarAv.executar({ descricao: 'Tubo de forno', cliente: 'Whirlpool' });
    expect(av.pasta).not.toBeNull();

    const listar = new ListarArquivosDaPasta(deps);
    expect(await listar.executar(av.id)).toMatchObject({ existe: true, itens: [] });

    mkdirSync(path.join(av.pasta!, 'E-mails'));
    writeFileSync(path.join(av.pasta!, 'E-mails', 'pedido.msg'), 'x');
    writeFileSync(path.join(av.pasta!, 'desenho.pdf'), 'pdf');
    writeFileSync(path.join(av.pasta!, 'Thumbs.db'), 'lixo');
    const conteudo = await listar.executar(av.id);
    expect(conteudo.itens.map((i) => [i.caminhoRelativo, i.ehPasta, i.profundidade])).toEqual([
      ['E-mails', true, 0],
      ['E-mails\\pedido.msg', false, 1],
      ['desenho.pdf', false, 0],
    ]);

    rmSync(av.pasta!, { recursive: true });
    expect(await listar.executar(av.id)).toMatchObject({ existe: false });
  });

  it('só o administrador define a raiz, e ela precisa existir', async () => {
    await expect(new SalvarPastaConfig(deps).executar({ pastaRaiz: path.join(raiz, 'nao-existe') })).rejects.toThrow(/não existe/);
    logado = { id: 'u1', nome: 'Erico', perfil: 'gestor' };
    await expect(new SalvarPastaConfig(deps).executar({ pastaRaiz: raiz })).rejects.toThrow(/administradores/);
  });
});
