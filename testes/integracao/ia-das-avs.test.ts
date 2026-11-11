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
import { ExcluirConversa, limparConversasAntigas, ListarConversas, ObterConversa } from '../../electron/modulos/ia/aplicacao/conversas';
import type { PerfilDeQuemConversa } from '../../electron/modulos/ia/aplicacao/portas';
import { RepositorioDeConversasSqlite } from '../../electron/modulos/ia/infraestrutura/repositorio-de-conversas-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
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
        return { texto: 'RESUMO:\nTudo sob controle.\nPONTOS DE ATENÇÃO:\n- AV 26-001 atrasada.', modelo: pedido.modelo };
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

  it('o chat sabe quem pergunta e guarda a conversa só para essa pessoa', async () => {
    const erico: PerfilDeQuemConversa = {
      id: 'u1',
      nome: 'Erico',
      departamento: 'Gestão de Projetos',
      perfil: 'administrador',
      papeis: ['Gestor de Programa'],
      nomeDoRecurso: 'Érico Hyodo',
    };
    await new RepositorioUsuariosSqlite(db).salvar(
      Usuario.criar({ id: 'u2', nome: 'Luciana', login: 'luciana', senhaHash: 'h', perfil: 'usuario', agora: new Date() }),
    );
    let logado: PerfilDeQuemConversa | null = erico;
    const conversas = new RepositorioDeConversasSqlite(db);
    deps.quemEstaUsando = { nomeDoUsuarioAtual: () => logado?.nome ?? null, perfilDoUsuarioAtual: async () => logado };
    deps.conversas = conversas;
    const historico = { conversas, quemEstaUsando: deps.quemEstaUsando, geradorDeId: deps.geradorDeId, relogio: deps.relogio };
    const chat = new ConversarSobreAvs(deps);

    const primeira = await chat.executar({ mensagens: [{ papel: 'usuario', texto: 'Quais AVs estão comigo?' }] });
    expect(primeira.conversaId).toBeTruthy();
    expect(pedidos[0]!.instrucoes).toContain('Quem está conversando com você: Erico (Gestão de Projetos; perfil administrador; Gestor de Programa)');
    expect(pedidos[0]!.instrucoes).toContain('responsável "Érico Hyodo"');

    const segunda = await chat.executar({
      conversaId: primeira.conversaId,
      mensagens: [
        { papel: 'usuario', texto: 'Quais AVs estão comigo?' },
        { papel: 'ia', texto: primeira.texto },
        { papel: 'usuario', texto: 'E qual está mais atrasada?' },
      ],
    });
    expect(segunda.conversaId).toBe(primeira.conversaId);
    const lista = await new ListarConversas(historico).executar('avs');
    expect(lista).toEqual([expect.objectContaining({ id: primeira.conversaId, titulo: 'Quais AVs estão comigo?' })]);
    expect((await new ObterConversa(historico).executar(primeira.conversaId!)).mensagens.map((m) => m.papel)).toEqual([
      'usuario',
      'ia',
      'usuario',
      'ia',
    ]);
    expect(await new ListarConversas(historico).executar('projetos')).toEqual([]);

    // Outra pessoa não vê, não continua e não exclui a conversa do Erico.
    logado = { ...erico, id: 'u2', nome: 'Luciana', papeis: [], nomeDoRecurso: null };
    expect(await new ListarConversas(historico).executar('avs')).toEqual([]);
    await expect(new ObterConversa(historico).executar(primeira.conversaId!)).rejects.toThrow(/não existe/);
    await expect(
      chat.executar({ conversaId: primeira.conversaId, mensagens: [{ papel: 'usuario', texto: 'oi' }] }),
    ).rejects.toThrow(/não existe/);
    await expect(new ExcluirConversa(historico).executar(primeira.conversaId!)).rejects.toThrow(/não existe/);

    logado = erico;
    await new ExcluirConversa(historico).executar(primeira.conversaId!);
    expect(await new ListarConversas(historico).executar('avs')).toEqual([]);
  });

  it('apaga só as conversas sem uso há mais de 90 dias', async () => {
    const conversas = new RepositorioDeConversasSqlite(db);
    const agora = new Date('2026-11-11T12:00:00Z');
    const dias = (n: number) => new Date(agora.getTime() - n * 86_400_000);
    await conversas.criar({ id: 'velha', usuarioId: 'u1', escopo: 'avs', titulo: 'a', criadaEm: dias(120), atualizadaEm: dias(91) });
    await conversas.criar({ id: 'recente', usuarioId: 'u1', escopo: 'avs', titulo: 'b', criadaEm: dias(120), atualizadaEm: dias(89) });
    expect(await limparConversasAntigas(conversas, agora)).toBe(1);
    expect((await conversas.listar('u1', 'avs')).map((c) => c.id)).toEqual(['recente']);
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

    await configuracao.salvarModelo('claude-haiku-5-5', 'avs');
    expect((await new ObterEstadoIa(configuracao, configuracao, 'avs').executar()).modelo).toBe('claude-haiku-5-5');
    expect((await new ObterEstadoIa(configuracao, configuracao).executar()).modelo).toBe('claude-opus-5-5');
  });

});
