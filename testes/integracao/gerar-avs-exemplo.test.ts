/** O seed de AVs roda os casos de uso reais sobre SQLite em memória. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AtualizarComercial } from '../../electron/modulos/avs/aplicacao/casos-de-uso/atualizar-comercial';
import { AvancarEtapa } from '../../electron/modulos/avs/aplicacao/casos-de-uso/avancar-etapa';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { DeclinarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/declinar-av';
import { FinalizarECriarPreSd } from '../../electron/modulos/avs/aplicacao/casos-de-uso/finalizar-e-criar-pre-sd';
import { GerarAvsExemplo } from '../../electron/modulos/avs/aplicacao/casos-de-uso/gerar-avs-exemplo';
import { SalvarSecaoCusto } from '../../electron/modulos/avs/aplicacao/casos-de-uso/salvar-secao-custo';
import { SalvarSecaoProcesso } from '../../electron/modulos/avs/aplicacao/casos-de-uso/salvar-secao-processo';
import { SalvarSecaoProduto } from '../../electron/modulos/avs/aplicacao/casos-de-uso/salvar-secao-produto';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import type { ConsultaDeUsuarios } from '../../electron/modulos/avs/aplicacao/portas';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioHistoricoAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-historico-av-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import { RepositorioSecaoCustoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-custo-sqlite';
import { RepositorioSecaoProcessoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-processo-sqlite';
import { RepositorioSecaoProdutoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-produto-sqlite';
import { CriarPreSd } from '../../electron/modulos/sds/aplicacao/casos-de-uso/criar-pre-sd';
import { RepositorioSdsSqlite } from '../../electron/modulos/sds/infraestrutura/repositorio-sds-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../../electron/nucleo/infraestrutura/banco/migracoes';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('GerarAvsExemplo', () => {
  let db: BancoDeDados;
  let repositorio: RepositorioAvsSqlite;
  let gerar: GerarAvsExemplo;
  let perfil: 'administrador' | 'gestor';

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    perfil = 'administrador';

    const relogio = new RelogioFixo();
    const usuarios = new RepositorioUsuariosSqlite(db);
    await usuarios.salvar(
      Usuario.criar({ id: 'u1', nome: 'Erico', login: 'erico', senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }),
    );
    const consulta: ConsultaDeUsuarios = {
      usuarioAtual: () => ({ id: 'u1', nome: 'Erico', perfil }),
      listarAtivos: async () => [{ id: 'u1', nome: 'Erico' }],
      obterPerfilGlobal: async () => perfil,
    };

    repositorio = new RepositorioAvsSqlite(db);
    const historico = new RepositorioHistoricoAvSqlite(db);
    const autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    const ids = new GeradorDeIdSequencial('x');
    gerar = new GerarAvsExemplo(
      repositorio,
      historico,
      autorizacao,
      consulta,
      relogio,
      ids,
      new CriarAv(repositorio, relogio, ids, consulta, autorizacao),
      new AtualizarComercial(repositorio, autorizacao, consulta),
      new SalvarSecaoProduto(repositorio, new RepositorioSecaoProdutoSqlite(db), autorizacao, relogio, ids),
      new SalvarSecaoProcesso(repositorio, new RepositorioSecaoProcessoSqlite(db), autorizacao, relogio, ids),
      new SalvarSecaoCusto(repositorio, new RepositorioSecaoCustoSqlite(db), autorizacao, relogio, ids),
      new AvancarEtapa(repositorio, historico, autorizacao, relogio, ids, consulta),
      new DeclinarAv(repositorio, historico, autorizacao, relogio, ids, consulta),
    );
  });

  afterEach(() => db.close());

  it('cria 25 AVs em vários estágios e não duplica', async () => {
    expect(await gerar.executar()).toEqual({ criadas: 25, jaExistiam: false });

    const avs = await repositorio.listar();
    expect(avs).toHaveLength(25);
    const etapas = new Set(avs.map((av) => av.etapaAtual));
    expect([...etapas].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    expect(await gerar.executar()).toEqual({ criadas: 0, jaExistiam: true });
    expect(await repositorio.listar()).toHaveLength(25);
  });

  it('recusa quem não é administrador', async () => {
    perfil = 'gestor';
    await expect(gerar.executar()).rejects.toThrow(/administradores/);
  });
});

describe('Finalizar AV e criar Pré-SD', () => {
  it('cria a SD com o número da AV, move a AV para "SD Aberta" e não repete', async () => {
    const db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const relogio = new RelogioFixo();
    await new RepositorioUsuariosSqlite(db).salvar(
      Usuario.criar({ id: 'u1', nome: 'Erico', login: 'erico', senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }),
    );
    const consulta: ConsultaDeUsuarios = {
      usuarioAtual: () => ({ id: 'u1', nome: 'Erico', perfil: 'administrador' }),
      listarAtivos: async () => [{ id: 'u1', nome: 'Erico' }],
      obterPerfilGlobal: async () => 'administrador',
    };
    const ids = new GeradorDeIdSequencial('y');
    const repositorio = new RepositorioAvsSqlite(db);
    const autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    const sds = new CriarPreSd(new RepositorioSdsSqlite(db), relogio, ids);
    const finalizar = new FinalizarECriarPreSd(
      repositorio,
      new RepositorioHistoricoAvSqlite(db),
      autorizacao,
      { criar: (entrada) => sds.executar(entrada) },
      relogio,
      ids,
    );
    const criada = await new CriarAv(repositorio, relogio, ids, consulta, autorizacao).executar({ descricao: 'X' });

    // Ainda na etapa Comercial: não pode finalizar.
    await expect(finalizar.executar(criada.id)).rejects.toThrow(/Libere/);

    const av = (await repositorio.obterPorId(criada.id))!;
    av.moverParaEtapa(5);
    await repositorio.salvar(av);

    const sd = await finalizar.executar(criada.id);
    expect(sd.numero).toBe(criada.numero.replace('AV', 'SD'));
    expect(sd.numeroProjeto).toBe(criada.numero.replace('AV', 'PRO'));
    expect((await repositorio.obterPorId(criada.id))?.etapaAtual).toBe(7);
    await expect(finalizar.executar(criada.id)).rejects.toThrow();
    db.close();
  });
});
