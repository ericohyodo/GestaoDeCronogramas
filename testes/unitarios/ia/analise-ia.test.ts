import type { ContextoDoChat } from '../../../electron/modulos/ia/aplicacao/contexto-do-chat';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ModeloIaDTO, ProvedorIaDTO } from '@contratos/ia.contrato';
import type { EstruturaCronogramaDTO, LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import {
  AnalisarCronograma,
  ConfigurarIa,
  ConversarComIa,
  type DependenciasDaAnalise,
  ObterEstadoIa,
  RemoverChaveIa,
} from '../../../electron/modulos/ia/aplicacao/casos-de-uso';
import { ErroNaIa } from '../../../electron/modulos/ia/aplicacao/erro-na-ia';
import type {
  CofreDeChave,
  InstrucoesSalvas,
  ModeloDeAnalise,
  PedidoDeAnalise,
  PedidoDeAnalisePortfolio,
  PedidoDeConversa,
  RepositorioDeConfiguracaoIa,
  RepositorioDeInstrucoesIa,
  ResultadoDaConversa,
  ResultadoDoModelo,
  ResultadoDoPortfolio,
} from '../../../electron/modulos/ia/aplicacao/portas';
import { ErroDeValidacao } from '../../../electron/nucleo/dominio/erro-de-dominio';
import { ArquivoDeAnalisesEmMemoria, GeradorDeIdSequencial, RelogioFixo } from '../../dubles/dubles';

const CHAVE_VALIDA = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123';

class ArmazenamentoFalso implements CofreDeChave, RepositorioDeConfiguracaoIa {
  chaves: Record<ProvedorIaDTO, string | null> = { anthropic: null, google: null, openrouter: null };
  modelo: ModeloIaDTO | null = null;
  async obter(provedor: ProvedorIaDTO) {
    return this.chaves[provedor];
  }
  async salvar(provedor: ProvedorIaDTO, chave: string) {
    this.chaves[provedor] = chave;
  }
  async remover(provedor: ProvedorIaDTO) {
    this.chaves[provedor] = null;
  }
  async obterModelo() {
    return this.modelo;
  }
  async salvarModelo(modelo: ModeloIaDTO) {
    this.modelo = modelo;
  }
}

class ModeloFalso implements ModeloDeAnalise {
  recusarChave = false;
  pedidos: PedidoDeAnalise[] = [];
  pedidosDePortfolio: PedidoDeAnalisePortfolio[] = [];
  pedidosDeConversa: PedidoDeConversa[] = [];
  async testar() {
    if (this.recusarChave) throw new ErroNaIa('A chave da API foi recusada.');
  }
  async analisar(pedido: PedidoDeAnalise): Promise<ResultadoDoModelo> {
    this.pedidos.push(pedido);
    return { modelo: pedido.modelo, saude: 'atencao', resumo: 'ok', riscos: [], gargalos: [], sugestoes: [] };
  }
  async analisarPortfolio(pedido: PedidoDeAnalisePortfolio): Promise<ResultadoDoPortfolio> {
    this.pedidosDePortfolio.push(pedido);
    return { modelo: pedido.modelo, saude: 'atencao', resumo: 'ok', projetos: [], conflitosDeRecursos: [], riscos: [], prioridades: [] };
  }
  async conversar(pedido: PedidoDeConversa): Promise<ResultadoDaConversa> {
    this.pedidosDeConversa.push(pedido);
    return { texto: 'resposta da IA', modelo: pedido.modelo };
  }
}

class InstrucoesFalsas implements RepositorioDeInstrucoesIa {
  salvas: InstrucoesSalvas | null = null;
  async obterInstrucoes() {
    return this.salvas;
  }
  async salvarInstrucoes(instrucoes: InstrucoesSalvas) {
    this.salvas = instrucoes;
  }
}

function linha(parcial: Partial<LinhaEstruturaDTO> & Pick<LinhaEstruturaDTO, 'id' | 'numero' | 'tipo'>): LinhaEstruturaDTO {
  return {
    nivel: parcial.tipo === 'fase' ? 0 : 1,
    faseId: null,
    titulo: `Linha ${parcial.numero}`,
    descricao: null,
    dataInicio: '2026-10-01',
    dataFim: '2026-10-02',
    duracaoEmDias: 2,
    percentualConcluido: 0,
    situacao: null,
    responsavelId: null,
    responsavelNome: null,
    evidencia: null,
    dataEfetiva: null,
    dependencias: [],
    dependenciasNumeros: [],
    critico: false,
    folgaEmDias: null,
    conflitoDeDependencia: false,
    ...parcial,
  };
}

const estrutura: EstruturaCronogramaDTO = {
  cronogramaId: 'c1',
  inicio: '2026-10-01',
  fim: '2026-10-10',
  linhas: [
    linha({ id: 'f1', numero: '1', tipo: 'fase', titulo: 'Planejamento' }),
    linha({
      id: 't1',
      numero: '1.1',
      tipo: 'tarefa',
      faseId: 'f1',
      titulo: 'PFMEA',
      responsavelNome: 'Allan',
      evidencia: 'Informação interna que não deve sair',
      dependenciasNumeros: [],
      critico: true,
    }),
  ],
};

describe('Análise com IA', () => {
  let armazenamento: ArmazenamentoFalso;
  let modelo: ModeloFalso;
  let instrucoes: InstrucoesFalsas;
  let analisar: AnalisarCronograma;
  let conversar: ConversarComIa;
  let deps: DependenciasDaAnalise;
  let arquivo: ArquivoDeAnalisesEmMemoria;

  beforeEach(() => {
    armazenamento = new ArmazenamentoFalso();
    modelo = new ModeloFalso();
    instrucoes = new InstrucoesFalsas();
    arquivo = new ArquivoDeAnalisesEmMemoria();
    deps = {
      cofre: armazenamento,
      configuracao: armazenamento,
      modelo,
      consultaDeAvs: { relatorio: async () => [] },
      consultaDeCronograma: {
        obterResumo: async (id) =>
          id === 'c1'
            ? { nome: 'S Riko', situacao: 'em_andamento', dataInicio: '2026-08-01', dataFim: '2026-11-28', descricao: null }
            : null,
        listarIdsAtivos: async () => ['c1'],
      },
      consultaDeEstrutura: { obterEstrutura: async () => estrutura },
      instrucoes,
      arquivo,
      quemEstaUsando: { nomeDoUsuarioAtual: () => 'Érico' },
      geradorDeId: new GeradorDeIdSequencial('analise'),
      relogio: new RelogioFixo(new Date('2026-09-24T15:00:00')),
    };
    analisar = new AnalisarCronograma(deps);
    conversar = new ConversarComIa(deps);
  });

  it('sem chave configurada, explica o que fazer em vez de chamar a API', async () => {
    await expect(analisar.executar('c1')).rejects.toThrow(ErroNaIa);
    expect(modelo.pedidos).toHaveLength(0);
  });

  it('envia o cronograma resumido, com números WBS e sem a evidência nem IDs internos', async () => {
    armazenamento.chaves.anthropic = CHAVE_VALIDA;
    armazenamento.modelo = 'claude-sonnet-5';

    const analise = await analisar.executar('c1');

    const pedido = modelo.pedidos[0]!;
    expect(pedido.modelo).toBe('claude-sonnet-5');
    expect(pedido.contexto.hoje).toBe('2026-09-24');
    expect(pedido.contexto.linhas[1]).toMatchObject({ n: '1.1', fase: 'Planejamento', responsavel: 'Allan', critico: true });
    const enviado = JSON.stringify(pedido.contexto);
    expect(enviado).not.toContain('Informação interna');
    expect(enviado).not.toContain('"t1"');
    expect(analise.saude).toBe('atencao');
    expect(analise.geradaEm).toBeTruthy();
  });

  it('guarda a análise no arquivo, com quem gerou e o nome do cronograma', async () => {
    armazenamento.chaves.anthropic = CHAVE_VALIDA;

    const analise = await analisar.executar('c1');

    expect(analise).toMatchObject({ id: 'analise-1', geradaPor: 'Érico' });
    expect(arquivo.analises).toEqual([
      {
        id: 'analise-1',
        tipo: 'cronograma',
        cronogramaId: 'c1',
        titulo: 'S Riko',
        modelo: 'claude-opus-5',
        saude: 'atencao',
        geradaEm: analise.geradaEm,
        geradaPor: 'Érico',
        analise,
      },
    ]);
  });

  it('não guarda nada quando a IA falha', async () => {
    armazenamento.chaves.anthropic = CHAVE_VALIDA;
    modelo.analisar = async () => {
      throw new ErroNaIa('indisponível');
    };
    await expect(analisar.executar('c1')).rejects.toThrow(ErroNaIa);
    expect(arquivo.analises).toHaveLength(0);
  });

  it('usa o Opus 5 quando nenhum modelo foi escolhido', async () => {
    armazenamento.chaves.anthropic = CHAVE_VALIDA;
    await analisar.executar('c1');
    expect(modelo.pedidos[0]!.modelo).toBe('claude-opus-5');
  });

  it('recusa cronograma inexistente', async () => {
    armazenamento.chaves.anthropic = CHAVE_VALIDA;
    await expect(analisar.executar('nao-existe')).rejects.toThrow('não encontrado');
  });

  it('só salva uma chave nova depois de a API aceitá-la', async () => {
    const configurar = new ConfigurarIa(armazenamento, armazenamento, modelo);

    await expect(configurar.executar({ chave: 'abc', modelo: 'claude-opus-5' })).rejects.toThrow(ErroDeValidacao);

    modelo.recusarChave = true;
    await expect(configurar.executar({ chave: CHAVE_VALIDA, modelo: 'claude-opus-5' })).rejects.toThrow(ErroNaIa);
    expect(armazenamento.chaves.anthropic).toBeNull();

    modelo.recusarChave = false;
    const estado = await configurar.executar({ chave: `  ${CHAVE_VALIDA}  `, modelo: 'claude-sonnet-5' });
    expect(armazenamento.chaves.anthropic).toBe(CHAVE_VALIDA);
    expect(estado).toEqual({
      configurada: true,
      modelo: 'claude-sonnet-5',
      provedor: 'anthropic',
      chaves: { anthropic: '0123', google: null, openrouter: null },
    });
  });

  it('troca só o modelo mantendo a chave, e remove a chave', async () => {
    armazenamento.chaves.anthropic = CHAVE_VALIDA;
    await new ConfigurarIa(armazenamento, armazenamento, modelo).executar({ modelo: 'claude-sonnet-5' });
    expect(await new ObterEstadoIa(armazenamento, armazenamento).executar()).toMatchObject({
      configurada: true,
      modelo: 'claude-sonnet-5',
    });

    const estado = await new RemoverChaveIa(armazenamento, armazenamento).executar();
    expect(estado.configurada).toBe(false);
    expect(estado.chaves.anthropic).toBeNull();
  });

  describe('com o Gemini', () => {
    // Formato das chaves novas do Google AI Studio (com ponto); valor fictício.
    const CHAVE_GOOGLE = 'AQ.chaveFicticiaDeTesteParaOGemini0000000000';

    it('aceita a chave do AI Studio e a guarda separada da chave da Anthropic', async () => {
      armazenamento.chaves.anthropic = CHAVE_VALIDA;
      const estado = await new ConfigurarIa(armazenamento, armazenamento, modelo).executar({
        chave: CHAVE_GOOGLE,
        modelo: 'gemini-3.8-flash',
      });

      expect(armazenamento.chaves).toEqual({ anthropic: CHAVE_VALIDA, google: CHAVE_GOOGLE, openrouter: null });
      expect(estado).toMatchObject({ configurada: true, provedor: 'google', chaves: { anthropic: '0123', google: '0000' } });
    });

    it('trocar para o Gemini sem chave do Google não usa a chave da Anthropic', async () => {
      armazenamento.chaves.anthropic = CHAVE_VALIDA;
      armazenamento.modelo = 'gemini-3.8-flash';

      expect((await new ObterEstadoIa(armazenamento, armazenamento).executar()).configurada).toBe(false);
      await expect(analisar.executar('c1')).rejects.toThrow(ErroNaIa);
      expect(modelo.pedidos).toHaveLength(0);
    });

    it('analisa com a chave do Google quando o modelo é Gemini', async () => {
      armazenamento.chaves = { anthropic: CHAVE_VALIDA, google: CHAVE_GOOGLE, openrouter: null };
      armazenamento.modelo = 'gemini-3.5-flash-lite';

      await analisar.executar('c1');

      expect(modelo.pedidos[0]).toMatchObject({ chave: CHAVE_GOOGLE, modelo: 'gemini-3.5-flash-lite' });
    });
  });

  describe('com o OpenRouter', () => {
    // Formato das chaves do OpenRouter; valor fictício.
    const CHAVE_OPENROUTER = 'sk-or-v1-chaveFicticiaDeTeste0000000000';

    it('aceita a chave "sk-or-" e a guarda separada das demais', async () => {
      armazenamento.chaves.anthropic = CHAVE_VALIDA;
      const configurar = new ConfigurarIa(armazenamento, armazenamento, modelo);

      await expect(configurar.executar({ chave: 'sk-ant-nao-e-do-openrouter', modelo: 'openrouter/free' })).rejects.toThrow(
        ErroDeValidacao,
      );
      const estado = await configurar.executar({ chave: CHAVE_OPENROUTER, modelo: 'openrouter/free' });

      expect(armazenamento.chaves.openrouter).toBe(CHAVE_OPENROUTER);
      expect(armazenamento.chaves.anthropic).toBe(CHAVE_VALIDA);
      expect(estado).toMatchObject({ configurada: true, provedor: 'openrouter', chaves: { openrouter: '0000' } });
    });

    it('analisa com a chave do OpenRouter quando o modelo é ":free"', async () => {
      armazenamento.chaves.openrouter = CHAVE_OPENROUTER;
      armazenamento.modelo = 'qwen/qwen3.8-27b:free';

      await analisar.executar('c1');

      expect(modelo.pedidos[0]).toMatchObject({ chave: CHAVE_OPENROUTER, modelo: 'qwen/qwen3.8-27b:free' });
    });
  });
  describe('chat', () => {
    const pergunta = (texto: string) => ({ papel: 'usuario' as const, texto });
    const resposta = (texto: string) => ({ papel: 'ia' as const, texto });

    it('sem chave configurada, não chama a API', async () => {
      await expect(conversar.executar({ mensagens: [pergunta('Quem está atrasado?')] })).rejects.toThrow(ErroNaIa);
      expect(modelo.pedidosDeConversa).toHaveLength(0);
    });

    it('envia os dados dos projetos sem a evidência nem IDs internos, e devolve a resposta', async () => {
      armazenamento.chaves.anthropic = CHAVE_VALIDA;

      const saida = await conversar.executar({ mensagens: [pergunta('Quem está atrasado?')] });

      expect(saida).toEqual({ texto: 'resposta da IA', modelo: 'claude-opus-5' });
      const pedido = modelo.pedidosDeConversa[0]!;
      const contexto = pedido.contexto as ContextoDoChat;
      expect(contexto.hoje).toBe('2026-09-24');
      expect(contexto.projetos).toHaveLength(1);
      expect(contexto.projetos[0]!.cronograma.nome).toBe('S Riko');
      expect(contexto.projetos[0]!.linhas[1]).toMatchObject({ n: '1.1', responsavel: 'Allan' });
      const enviado = JSON.stringify(pedido);
      expect(enviado).not.toContain('Informação interna');
      expect(enviado).not.toContain('"t1"');
      expect(pedido.instrucoes).toContain('SOMENTE os dados');
    });

    it('repassa o histórico e ignora respostas soltas no início quando ele é cortado', async () => {
      armazenamento.chaves.anthropic = CHAVE_VALIDA;
      const historico = Array.from({ length: 11 }, (_, i) => [pergunta(`p${i}`), resposta(`r${i}`)]).flat();

      await conversar.executar({ mensagens: [...historico, pergunta('última')] });

      const enviadas = modelo.pedidosDeConversa[0]!.mensagens;
      expect(enviadas.at(-1)).toEqual(pergunta('última'));
      expect(enviadas[0]!.papel).toBe('usuario');
      expect(enviadas.length).toBeLessThanOrEqual(20);
    });

    it('recusa histórico que não termina em pergunta, fora de ordem ou grande demais', async () => {
      armazenamento.chaves.anthropic = CHAVE_VALIDA;
      await expect(conversar.executar({ mensagens: [pergunta('a'), resposta('b')] })).rejects.toThrow(ErroDeValidacao);
      await expect(conversar.executar({ mensagens: [pergunta('a'), pergunta('b')] })).rejects.toThrow(ErroDeValidacao);
      await expect(conversar.executar({ mensagens: [pergunta('   ')] })).rejects.toThrow(ErroDeValidacao);
      await expect(conversar.executar({ mensagens: [pergunta('x'.repeat(2001))] })).rejects.toThrow(ErroDeValidacao);
      expect(modelo.pedidosDeConversa).toHaveLength(0);
    });

    it('recusa em vez de truncar quando os dados não cabem numa consulta', async () => {
      armazenamento.chaves.anthropic = CHAVE_VALIDA;
      const grande: EstruturaCronogramaDTO = {
        ...estrutura,
        linhas: Array.from({ length: 6000 }, (_, i) =>
          linha({ id: `t${i}`, numero: `1.${i}`, tipo: 'tarefa', titulo: `Atividade número ${i} com um título razoavelmente longo`, responsavelNome: 'Allan' }),
        ),
      };
      const conversarComMuitosDados = new ConversarComIa({
        ...deps,
        consultaDeEstrutura: { obterEstrutura: async () => grande },
      });

      await expect(conversarComMuitosDados.executar({ mensagens: [pergunta('Resumo?')] })).rejects.toThrow('dados demais');
      expect(modelo.pedidosDeConversa).toHaveLength(0);
    });

    it('usa a chave do provedor do modelo escolhido', async () => {
      armazenamento.chaves.openrouter = 'sk-or-v1-chaveFicticiaDeTeste0000000000';
      armazenamento.modelo = 'openrouter/free';

      await conversar.executar({ mensagens: [pergunta('Resumo?')] });

      expect(modelo.pedidosDeConversa[0]).toMatchObject({
        chave: 'sk-or-v1-chaveFicticiaDeTeste0000000000',
        modelo: 'openrouter/free',
      });
    });
  });
});
