/** Relatório e IA do módulo de AVs (análise e chat), com SQLite real e um modelo de IA falso. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { AtualizarComercial } from '../../electron/modulos/avs/aplicacao/casos-de-uso/atualizar-comercial';
import { ObterRelatorioAvs } from '../../electron/modulos/avs/aplicacao/casos-de-uso/obter-relatorio-avs';
import { SalvarSecaoProduto } from '../../electron/modulos/avs/aplicacao/casos-de-uso/salvar-secao-produto';
import type { ConsultaDeUsuarios } from '../../electron/modulos/avs/aplicacao/portas';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioHistoricoAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-historico-av-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import { RepositorioSecaoCustoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-custo-sqlite';
import { RepositorioSecaoProcessoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-processo-sqlite';
import { RepositorioSecaoProdutoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-produto-sqlite';
import { AnalisarAvs, ConversarSobreAvs, UltimaAnaliseAvs } from '../../electron/modulos/ia/aplicacao/casos-de-uso-avs';
import {
  ObterInstrucoesIa,
  SalvarInstrucoesIa,
} from '../../electron/modulos/ia/aplicacao/casos-de-uso-instrucoes';
import { ObterEstadoIa, type DependenciasDaAnalise } from '../../electron/modulos/ia/aplicacao/casos-de-uso';
import type { ModeloDeAnalise, PedidoDeConversa } from '../../electron/modulos/ia/aplicacao/portas';
import { ConfiguracaoIaSqlite } from '../../electron/modulos/ia/infraestrutura/configuracao-ia-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../../electron/nucleo/infraestrutura/banco/migracoes';
import { ArquivoDeAnalisesEmMemoria, GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

const CHAVE_VALIDA = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123';

describe('Relatório e IA das AVs', () => {
  let db: BancoDeDados;
  let relatorio: ObterRelatorioAvs;
  let deps: DependenciasDaAnalise;
  let configuracao: ConfiguracaoIaSqlite;
  let pedidos: PedidoDeConversa[];
  let arquivo: ArquivoDeAnalisesEmMemoria;

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    // "Hoje" é 22/09/2026 (RelogioFixo); o prazo abaixo já venceu.
    const relogio = new RelogioFixo();
    await new RepositorioUsuariosSqlite(db).salvar(
      Usuario.criar({ id: 'u1', nome: 'Erico', login: 'erico', senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }),
    );
    const consulta: ConsultaDeUsuarios = {
      usuarioAtual: () => ({ id: 'u1', nome: 'Erico', perfil: 'administrador' }),
      listarAtivos: async () => [{ id: 'u1', nome: 'Erico' }],
      obterPerfilGlobal: async () => 'administrador',
    };
    const ids = new GeradorDeIdSequencial('i');
    const avs = new RepositorioAvsSqlite(db);
    const autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    const produto = new RepositorioSecaoProdutoSqlite(db);

    const criada = await new CriarAv(avs, relogio, ids, consulta, autorizacao).executar({
      descricao: 'Mufla M8HB0010A',
      cliente: 'S Riko',
      prazoCliente: '2026-09-01',
      membros: { comercial: 'u1' },
    });
    await new AtualizarComercial(avs, autorizacao, consulta).executar({ avId: criada.id, familia: 'Mufla', volumeAnual: 5000 });
    await new SalvarSecaoProduto(avs, produto, autorizacao, relogio, ids).executar({
      avId: criada.id,
      complexidade: 'Alta',
      estrutura: [],
      investimentos: [{ descricao: 'Dispositivo', classificacao: 'capex', valor: 12000 }],
    });

    relatorio = new ObterRelatorioAvs(
      avs,
      new RepositorioHistoricoAvSqlite(db),
      produto,
      new RepositorioSecaoProcessoSqlite(db),
      new RepositorioSecaoCustoSqlite(db),
      consulta,
      relogio,
    );

    configuracao = new ConfiguracaoIaSqlite(db);
    await configuracao.salvar('anthropic', CHAVE_VALIDA);
    pedidos = [];
    const modelo = {
      conversar: async (pedido: PedidoDeConversa) => {
        pedidos.push(pedido);
        return { texto: 'RESUMO:\nTudo sob controle.\nPONTOS DE ATENÇÃO:\n- AV 0001-26 atrasada.', modelo: pedido.modelo };
      },
      testar: async () => undefined,
    } as unknown as ModeloDeAnalise;
    arquivo = new ArquivoDeAnalisesEmMemoria();
    deps = {
      cofre: configuracao,
      configuracao,
      modelo,
      consultaDeCronograma: { obterResumo: async () => null, listarIdsAtivos: async () => [] },
      consultaDeEstrutura: { obterEstrutura: async () => ({ linhas: [] }) as never },
      consultaDeAvs: { relatorio: () => relatorio.executar() },
      instrucoes: configuracao,
      arquivo,
      quemEstaUsando: { nomeDoUsuarioAtual: () => 'Erico' },
      geradorDeId: ids,
      relogio,
    };
  });

  afterEach(() => db.close());

  it('o relatório traz etapa, atraso, responsável e valores consolidados de cada AV', async () => {
    const [linha] = await relatorio.executar();
    expect(linha).toMatchObject({
      numero: expect.stringContaining('AV'),
      cliente: 'S Riko',
      etapa: 'Comercial — Abertura',
      situacao: 'em_andamento',
      atrasada: true,
      responsavelDaEtapa: 'Erico',
      familia: 'Mufla',
      complexidade: 'Alta',
      volumeAnual: 5000,
      investimentoTotal: 12000,
      custoPorPeca: 0,
    });
  });

  it('a análise das AVs usa as instruções e o modelo próprios, e fica no arquivo', async () => {
    const analise = await new AnalisarAvs(deps).executar();

    expect(analise).toMatchObject({ quantidadeDeAvs: 1, saude: 'critico', geradaPor: 'Erico' });
    expect(analise.texto).toContain('RESUMO:');
    expect(arquivo.analises).toHaveLength(1);
    expect(arquivo.analises[0]).toMatchObject({ tipo: 'avs', titulo: 'AVs', cronogramaId: null });
    expect((await new UltimaAnaliseAvs(deps).executar())?.id).toBe(analise.id);

    const pedido = pedidos[0]!;
    expect(pedido.rotuloDosDados).toBe('Dados das AVs (JSON)');
    expect(pedido.instrucoes).toContain('Análises de Viabilidade');
    expect(pedido.instrucoes).toContain('AVs com prazo vencido'); // checklist padrão das AVs
    expect(pedido.instrucoes).not.toContain('APQP');
    const enviado = JSON.stringify(pedido.contexto);
    expect(enviado).toContain('S Riko');
    expect(enviado).not.toContain('"id"'); // sem IDs internos
  });

  it('o chat das AVs responde com os dados das AVs e valida o histórico', async () => {
    const resposta = await new ConversarSobreAvs(deps).executar({
      mensagens: [{ papel: 'usuario', texto: 'Quais AVs estão atrasadas?' }],
    });
    expect(resposta.texto).toContain('RESUMO');
    expect(pedidos[0]!.instrucoes).toContain('assistente da área de viabilidade');
    await expect(new ConversarSobreAvs(deps).executar({ mensagens: [{ papel: 'ia', texto: 'oi' }] })).rejects.toThrow();
  });

  it('sem chave configurada a análise explica o que fazer, e sem AVs não há o que analisar', async () => {
    await configuracao.remover('anthropic');
    await expect(new AnalisarAvs(deps).executar()).rejects.toThrow(/não foi configurada/);
    await configuracao.salvar('anthropic', CHAVE_VALIDA);
    deps.consultaDeAvs = { relatorio: async () => [] };
    await expect(new AnalisarAvs(deps).executar()).rejects.toThrow(/Ainda não há AVs/);
  });

  it('instruções e modelo das AVs são independentes dos de Projetos', async () => {
    const relogio = new RelogioFixo();
    const instrucoesAvs = await new ObterInstrucoesIa(configuracao, 'avs').executar();
    const instrucoesProjetos = await new ObterInstrucoesIa(configuracao, 'projetos').executar();
    expect(instrucoesAvs.checklist[0]?.texto).toContain('AVs com prazo vencido');
    expect(instrucoesProjetos.checklist[0]?.texto).toContain('atrasadas');

    await new SalvarInstrucoesIa(configuracao, relogio, 'avs').executar({
      checklist: [{ texto: 'Só isto', ativo: true }],
      orientacoes: 'Priorize a Whirlpool.',
    });
    expect((await new ObterInstrucoesIa(configuracao, 'avs').executar()).orientacoes).toBe('Priorize a Whirlpool.');
    expect((await new ObterInstrucoesIa(configuracao, 'projetos').executar()).orientacoes).toBe('');

    await configuracao.salvarModelo('gemini-3.8-flash', 'avs');
    expect((await new ObterEstadoIa(configuracao, configuracao, 'avs').executar()).modelo).toBe('gemini-3.8-flash');
    expect((await new ObterEstadoIa(configuracao, configuracao).executar()).modelo).toBe('claude-opus-5');
  });
});
