/** Seção do PCP (cargas, custos logísticos, observações) e complexidade da Eng. Produto, com SQLite real. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { ObterSecaoPcp, SalvarSecaoPcp } from '../../electron/modulos/avs/aplicacao/casos-de-uso/secao-pcp';
import { SalvarSecaoProduto } from '../../electron/modulos/avs/aplicacao/casos-de-uso/salvar-secao-produto';
import { ObterSecaoProduto } from '../../electron/modulos/avs/aplicacao/casos-de-uso/obter-secao-produto';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import type { ConsultaDeUsuarios } from '../../electron/modulos/avs/aplicacao/portas';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import { RepositorioSecaoPcpSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-pcp-sqlite';
import { RepositorioSecaoProdutoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-produto-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../../electron/nucleo/infraestrutura/banco/migracoes';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('PCP e complexidade', () => {
  let db: BancoDeDados;
  let avId: string;
  let salvarPcp: SalvarSecaoPcp;
  let obterPcp: ObterSecaoPcp;
  let salvarProduto: SalvarSecaoProduto;
  let obterProduto: ObterSecaoProduto;

  beforeEach(async () => {
    db = abrirConexao(':memory:');
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
    const ids = new GeradorDeIdSequencial('p');
    const avs = new RepositorioAvsSqlite(db);
    const autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    avId = (await new CriarAv(avs, relogio, ids, consulta, autorizacao).executar({ descricao: 'Item' })).id;

    const pcp = new RepositorioSecaoPcpSqlite(db);
    salvarPcp = new SalvarSecaoPcp(avs, pcp, autorizacao, relogio, ids);
    obterPcp = new ObterSecaoPcp(pcp);
    const produto = new RepositorioSecaoProdutoSqlite(db);
    salvarProduto = new SalvarSecaoProduto(avs, produto, autorizacao, relogio, ids);
    obterProduto = new ObterSecaoProduto(produto);
  });

  afterEach(() => db.close());

  it('grava cargas, custos logísticos e observações e valida percentuais', async () => {
    await salvarPcp.executar({
      avId,
      observacoes: 'Gargalo na prensa',
      cargas: [
        { operacao: 'Estampagem', maquina: 'PR-042', pecasHora: 600, cargaAtual: 62.5, cargaFutura: 81 },
        { operacao: 'Solda', cargaAtual: 40, cargaFutura: 120 },
      ],
      custos: [{ descricao: 'Estante de armazenagem', valor: 3500 }],
    });

    const lida = await obterPcp.executar(avId);
    expect(lida.observacoes).toBe('Gargalo na prensa');
    expect(lida.cargas.map((c) => [c.operacao, c.maquina, c.cargaAtual, c.cargaFutura])).toEqual([
      ['Estampagem', 'PR-042', 62.5, 81],
      ['Solda', null, 40, 120],
    ]);
    expect(lida.custos).toMatchObject([{ descricao: 'Estante de armazenagem', valor: 3500 }]);

    await expect(
      salvarPcp.executar({ avId, cargas: [{ operacao: 'X', cargaAtual: -1 }], custos: [] }),
    ).rejects.toThrow(/percentual/);
    await expect(salvarPcp.executar({ avId, cargas: [{ operacao: ' ' }], custos: [] })).rejects.toThrow(/operação/i);
  });

  it('guarda a complexidade na seção da Eng. Produto', async () => {
    await salvarProduto.executar({ avId, complexidade: 'Alta', estrutura: [], investimentos: [] });
    expect((await obterProduto.executar(avId)).complexidade).toBe('Alta');
  });

  it('grava a estrutura do produto em árvore e barra combinações inválidas', async () => {
    await salvarProduto.executar({
      avId,
      investimentos: [],
      estrutura: [
        { chave: 'a', paiChave: null, tipo: 'componente', codigo: 'SP-1', descricao: 'Suporte', quantidade: 2, unidade: 'un' },
        // 2º nível: dentro de um item de 1º nível.
        { chave: 'b', paiChave: 'a', tipo: 'componente', descricao: 'Reforço', quantidade: 1 },
        { chave: 'i', paiChave: 'b', tipo: 'materia_prima', descricao: 'Aço SAE 1020', quantidade: 0.4, unidade: 'kg' },
        { chave: 's', paiChave: null, tipo: 'conjunto', descricao: 'Subconjunto soldado' },
        { chave: 'c', paiChave: 's', tipo: 'componente', descricao: 'Bucha' },
        { chave: 'e', paiChave: null, tipo: 'embalagem', descricao: 'Caixa retornável' },
      ],
    });

    const { estrutura } = await obterProduto.executar(avId);
    expect(estrutura.map((no) => [no.tipo, no.descricao])).toEqual([
      ['componente', 'Suporte'],
      ['componente', 'Reforço'],
      ['materia_prima', 'Aço SAE 1020'],
      ['conjunto', 'Subconjunto soldado'],
      ['componente', 'Bucha'],
      ['embalagem', 'Caixa retornável'],
    ]);
    const porDescricao = new Map(estrutura.map((no) => [no.descricao, no]));
    expect(porDescricao.get('Suporte')?.paiId).toBeNull();
    expect(porDescricao.get('Reforço')?.paiId).toBe(porDescricao.get('Suporte')?.id);
    expect(porDescricao.get('Aço SAE 1020')).toMatchObject({ quantidade: 0.4, unidade: 'kg' });

    const salvar = (estruturaInvalida: Parameters<typeof salvarProduto.executar>[0]['estrutura']) =>
      salvarProduto.executar({ avId, investimentos: [], estrutura: estruturaInvalida });
    // Matéria-prima, insumo e embalagem são folhas.
    for (const folha of ['materia_prima', 'insumo', 'embalagem'] as const) {
      await expect(
        salvar([
          { chave: 'i', paiChave: null, tipo: folha, descricao: 'I' },
          { chave: 'f', paiChave: 'i', tipo: 'componente', descricao: 'Filho' },
        ]),
      ).rejects.toThrow(/não pode ficar dentro/);
    }
    await expect(salvar([{ chave: 'c', paiChave: 'inexistente', tipo: 'componente', descricao: 'C' }])).rejects.toThrow(/pai que não existe/);
    await expect(salvar([{ chave: 'c', paiChave: null, tipo: 'componente', descricao: ' ' }])).rejects.toThrow(/descrição/i);

    // Salvar de novo substitui a árvore inteira.
    await salvar([]);
    expect((await obterProduto.executar(avId)).estrutura).toEqual([]);
  });
});
