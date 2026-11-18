/** Gravação otimista: dois usuários com a mesma aba aberta — o segundo a salvar é avisado em vez de apagar o primeiro. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AtualizarComercial } from '../../electron/modulos/avs/aplicacao/casos-de-uso/atualizar-comercial';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { ObterAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/obter-av';
import { ObterSecaoPcp, SalvarSecaoPcp } from '../../electron/modulos/avs/aplicacao/casos-de-uso/secao-pcp';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import type { ConsultaDeUsuarios } from '../../electron/modulos/avs/aplicacao/portas';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import { RepositorioSecaoPcpSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-pcp-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { ErroConflitoDeEdicao } from '../../electron/nucleo/aplicacao/erros';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { ControleDeVersaoSqlite } from '../../electron/nucleo/infraestrutura/banco/controle-de-versao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('gravação otimista', () => {
  let db: BancoDeDados;
  let avId: string;
  let atualizar: AtualizarComercial;
  let obterAv: ObterAv;
  let salvarPcp: SalvarSecaoPcp;
  let obterPcp: ObterSecaoPcp;

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const relogio = new RelogioFixo();
    await new RepositorioUsuariosSqlite(db).salvar(
      Usuario.criar({ id: 'u1', nome: 'Admin', login: 'admin', senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }),
    );
    const consulta: ConsultaDeUsuarios = {
      usuarioAtual: () => ({ id: 'u1', nome: 'Admin', perfil: 'administrador' }),
      listarAtivos: async () => [{ id: 'u1', nome: 'Admin' }],
      obterPerfilGlobal: async () => 'administrador',
    };
    const ids = new GeradorDeIdSequencial('o');
    const avs = new RepositorioAvsSqlite(db);
    const autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    // Cada "PC" tem seu próprio objeto de controle, mas o mesmo arquivo de banco.
    const versoes = new ControleDeVersaoSqlite(db);
    avId = (await new CriarAv(avs, relogio, ids, consulta, autorizacao, versoes).executar({ descricao: 'Item' })).id;
    atualizar = new AtualizarComercial(avs, autorizacao, consulta, new ControleDeVersaoSqlite(db));
    obterAv = new ObterAv(avs, consulta, versoes);
    const pcp = new RepositorioSecaoPcpSqlite(db);
    salvarPcp = new SalvarSecaoPcp(avs, pcp, autorizacao, relogio, ids, versoes);
    obterPcp = new ObterSecaoPcp(pcp, versoes);
  });

  afterEach(() => db.close());

  it('recusa o segundo salvamento feito sobre uma versão desatualizada do Comercial', async () => {
    const lidaPorA = await obterAv.executar(avId);
    const lidaPorB = await obterAv.executar(avId);
    expect(lidaPorA.versaoComercial).toBe(1);

    const salvaPorA = await atualizar.executar({ avId, cliente: 'Cliente A', versaoEsperada: lidaPorA.versaoComercial });
    expect(salvaPorA.versaoComercial).toBe(2);

    await expect(
      atualizar.executar({ avId, cliente: 'Cliente B', versaoEsperada: lidaPorB.versaoComercial }),
    ).rejects.toBeInstanceOf(ErroConflitoDeEdicao);
    expect((await obterAv.executar(avId)).cliente).toBe('Cliente A');

    // Depois de recarregar, B grava normalmente.
    const recarregada = await obterAv.executar(avId);
    await atualizar.executar({ avId, cliente: 'Cliente B', versaoEsperada: recarregada.versaoComercial });
    expect((await obterAv.executar(avId)).cliente).toBe('Cliente B');
  });

  it('não deixa uma lista (PCP) apagar a do outro usuário', async () => {
    const versao = (await obterPcp.executar(avId)).versao;
    await salvarPcp.executar({ avId, versaoEsperada: versao, cargas: [{ operacao: 'Solda' }], custos: [] });
    await expect(
      salvarPcp.executar({ avId, versaoEsperada: versao, cargas: [], custos: [] }),
    ).rejects.toThrow(/Outro usuário/);
    expect((await obterPcp.executar(avId)).cargas).toHaveLength(1);
  });

  it('salvamento que falha na validação não consome a versão', async () => {
    const versao = (await obterPcp.executar(avId)).versao;
    await expect(
      salvarPcp.executar({ avId, versaoEsperada: versao, cargas: [{ operacao: 'X', cargaAtualPecas: -5 }], custos: [] }),
    ).rejects.toThrow();
    await salvarPcp.executar({ avId, versaoEsperada: versao, cargas: [], custos: [] });
  });
});

describe('unidade de trabalho (transação)', () => {
  it('desfaz todas as gravações quando o caso de uso falha no meio', async () => {
    const { UnidadeDeTrabalhoSqlite } = await import('../../electron/nucleo/infraestrutura/banco/unidade-de-trabalho-sqlite');
    const db = abrirConexao(':memory:');
    db.exec('CREATE TABLE t (v INTEGER)');
    const uow = new UnidadeDeTrabalhoSqlite(db);
    await expect(
      uow.executar(async () => {
        db.prepare('INSERT INTO t VALUES (1)').run();
        await Promise.resolve();
        db.prepare('INSERT INTO t VALUES (2)').run();
        throw new Error('falha no meio');
      }),
    ).rejects.toThrow('falha no meio');
    expect(db.prepare('SELECT COUNT(*) FROM t').pluck().get()).toBe(0);

    await uow.executar(async () => {
      db.prepare('INSERT INTO t VALUES (3)').run();
      await uow.executar(async () => db.prepare('INSERT INTO t VALUES (4)').run());
    });
    expect(db.prepare('SELECT COUNT(*) FROM t').pluck().get()).toBe(2);
    db.close();
  });
});
