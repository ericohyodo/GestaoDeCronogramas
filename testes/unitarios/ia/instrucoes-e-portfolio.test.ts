import { describe, expect, it } from 'vitest';
import type { ModeloIaDTO, ProvedorIaDTO } from '@contratos/ia.contrato';
import type { EstruturaCronogramaDTO, LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import { AnalisarPortfolio } from '../../../electron/modulos/ia/aplicacao/casos-de-uso';
import {
  ObterInstrucoesIa,
  RestaurarChecklistIa,
  SalvarInstrucoesIa,
} from '../../../electron/modulos/ia/aplicacao/casos-de-uso-instrucoes';
import { montarContextoDoPortfolio } from '../../../electron/modulos/ia/aplicacao/contexto-do-portfolio';
import { ErroNaIa } from '../../../electron/modulos/ia/aplicacao/erro-na-ia';
import {
  CHECKLIST_PADRAO,
  INSTRUCOES_FIXAS,
  montarInstrucoes,
} from '../../../electron/modulos/ia/aplicacao/instrucoes';
import type {
  InstrucoesSalvas,
  ModeloDeAnalise,
  PedidoDeAnalisePortfolio,
  RepositorioDeInstrucoesIa,
  ResumoDoCronograma,
} from '../../../electron/modulos/ia/aplicacao/portas';
import { ErroDeValidacao } from '../../../electron/nucleo/dominio/erro-de-dominio';
import { ArquivoDeAnalisesEmMemoria, GeradorDeIdSequencial, RelogioFixo } from '../../dubles/dubles';

class InstrucoesFalsas implements RepositorioDeInstrucoesIa {
  salvas: InstrucoesSalvas | null = null;
  async obterInstrucoes() {
    return this.salvas;
  }
  async salvarInstrucoes(instrucoes: InstrucoesSalvas) {
    this.salvas = instrucoes;
  }
}

const relogio = new RelogioFixo(new Date('2026-09-24T15:00:00'));

describe('Instruções da IA', () => {
  it('monta só com os itens ativos e omite as orientações quando vazias', () => {
    const texto = montarInstrucoes(
      [
        { texto: 'Olhar sign-offs', ativo: true },
        { texto: 'Item desligado', ativo: false },
      ],
      '   ',
    );
    expect(texto.startsWith(INSTRUCOES_FIXAS)).toBe(true);
    expect(texto).toContain('- Olhar sign-offs');
    expect(texto).not.toContain('Item desligado');
    expect(texto).not.toContain('Orientações da empresa');

    expect(montarInstrucoes([], 'SOP nunca pode atrasar')).toContain('SOP nunca pode atrasar');
  });

  it('antes da primeira gravação, devolve a checklist padrão APQP', async () => {
    const instrucoes = await new ObterInstrucoesIa(new InstrucoesFalsas()).executar();
    expect(instrucoes.checklist).toHaveLength(CHECKLIST_PADRAO.length);
    expect(instrucoes.atualizadoEm).toBeNull();
    expect(instrucoes.instrucoesFixas).toBe(INSTRUCOES_FIXAS);
  });

  it('salva descartando itens vazios e respeita os limites', async () => {
    const repositorio = new InstrucoesFalsas();
    const salvar = new SalvarInstrucoesIa(repositorio, relogio);

    const salvo = await salvar.executar({
      checklist: [
        { texto: '  Tarefas sem responsável  ', ativo: true },
        { texto: '   ', ativo: true },
      ],
      orientacoes: ' Priorize o SOP ',
    });
    expect(salvo.checklist).toEqual([{ texto: 'Tarefas sem responsável', ativo: true }]);
    expect(salvo.orientacoes).toBe('Priorize o SOP');
    expect(salvo.atualizadoEm).toBe(relogio.agora().toISOString());

    await expect(
      salvar.executar({ checklist: [{ texto: 'x'.repeat(301), ativo: true }], orientacoes: '' }),
    ).rejects.toThrow(ErroDeValidacao);
  });

  it('restaurar volta a checklist ao padrão e mantém as orientações', async () => {
    const repositorio = new InstrucoesFalsas();
    await new SalvarInstrucoesIa(repositorio, relogio).executar({
      checklist: [{ texto: 'Só este', ativo: true }],
      orientacoes: 'Manter',
    });
    const restaurado = await new RestaurarChecklistIa(repositorio, relogio).executar();
    expect(restaurado.checklist).toHaveLength(CHECKLIST_PADRAO.length);
    expect(restaurado.orientacoes).toBe('Manter');
  });
});

function tarefa(parcial: Partial<LinhaEstruturaDTO> & Pick<LinhaEstruturaDTO, 'id' | 'numero'>): LinhaEstruturaDTO {
  return {
    tipo: 'tarefa',
    nivel: 1,
    faseId: null,
    titulo: `Tarefa ${parcial.numero}`,
    descricao: null,
    dataInicio: '2026-09-20',
    dataFim: '2026-09-30',
    duracaoEmDias: 11,
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

const resumo = (nome: string, dataFim = '2026-12-31'): ResumoDoCronograma => ({
  nome,
  situacao: 'em_andamento',
  dataInicio: '2026-08-01',
  dataFim,
  descricao: null,
});

const estrutura = (linhas: LinhaEstruturaDTO[]): EstruturaCronogramaDTO => ({
  cronogramaId: 'x',
  inicio: '2026-08-01',
  fim: '2026-12-31',
  linhas,
});

describe('Portfólio', () => {
  it('resume cada projeto e soma a carga de cada pessoa entre projetos', () => {
    const contexto = montarContextoDoPortfolio(
      [
        {
          resumo: resumo('S Riko', '2026-10-15'),
          estrutura: estrutura([
            tarefa({ id: 'a', numero: '1.1', responsavelNome: 'Allan', dataFim: '2026-09-10', critico: true }),
            tarefa({ id: 'b', numero: '1.2', responsavelNome: 'Allan', dataFim: '2026-10-20' }),
            tarefa({ id: 'c', numero: '1.3', percentualConcluido: 100 }),
          ]),
        },
        {
          resumo: resumo('Mahle'),
          estrutura: estrutura([tarefa({ id: 'd', numero: '1.1', responsavelNome: 'Allan' })]),
        },
      ],
      '2026-09-24',
    );

    const [riko] = contexto.projetos;
    expect(riko).toMatchObject({
      nome: 'S Riko',
      tarefas: 3,
      concluidas: 1,
      atrasadas: 1,
      semResponsavel: 0,
      fimProjetado: '2026-10-20',
      atrasadasNoCaminhoCritico: ['1.1 Tarefa 1.1'],
    });
    expect(contexto.responsaveis[0]).toMatchObject({
      responsavel: 'Allan',
      projetos: ['S Riko', 'Mahle'],
      tarefasAbertas: 3,
      atrasadas: 1,
    });
  });

  it('analisa só projetos com atividades e usa as orientações da empresa', async () => {
    const pedidos: PedidoDeAnalisePortfolio[] = [];
    const modelo: ModeloDeAnalise = {
      testar: async () => undefined,
      analisar: async () => {
        throw new Error('não usado');
      },
      conversar: async () => {
        throw new Error('não usado');
      },
      analisarPortfolio: async (pedido) => {
        pedidos.push(pedido);
        return { modelo: pedido.modelo, saude: 'atencao', resumo: 'ok', projetos: [], conflitosDeRecursos: [], riscos: [], prioridades: [] };
      },
    };
    const armazenamento = {
      chaves: { anthropic: null, google: 'AQ.chaveFicticiaDeTesteParaOGemini0000000000' } as Record<ProvedorIaDTO, string | null>,
      obter: async (provedor: ProvedorIaDTO) => armazenamento.chaves[provedor],
      salvar: async () => undefined,
      remover: async () => undefined,
      obterModelo: async (): Promise<ModeloIaDTO> => 'gemini-3.5-flash-lite',
      salvarModelo: async () => undefined,
    };
    const instrucoes = new InstrucoesFalsas();
    instrucoes.salvas = { checklist: [], orientacoes: 'SOP é prioridade', atualizadoEm: new Date() };
    const estruturas: Record<string, EstruturaCronogramaDTO> = {
      c1: estrutura([tarefa({ id: 'a', numero: '1.1' })]),
      c2: estrutura([]),
    };

    const arquivo = new ArquivoDeAnalisesEmMemoria();
    const analise = await new AnalisarPortfolio({
      cofre: armazenamento,
      configuracao: armazenamento,
      modelo,
      consultaDeAvs: { relatorio: async () => [] },
      consultaDeCronograma: {
        obterResumo: async (id) => resumo(id),
        listarIdsAtivos: async () => ['c1', 'c2'],
      },
      consultaDeEstrutura: { obterEstrutura: async (id) => estruturas[id]! },
      instrucoes,
      arquivo,
      quemEstaUsando: { nomeDoUsuarioAtual: () => null },
      geradorDeId: new GeradorDeIdSequencial('analise'),
      relogio,
    }).executar();

    expect(analise.quantidadeDeProjetos).toBe(1);
    expect(await arquivo.ultima('portfolio', null)).toMatchObject({
      id: analise.id,
      tipo: 'portfolio',
      cronogramaId: null,
      titulo: 'Portfólio',
      geradaPor: null,
      analise,
    });
    expect(pedidos[0]!.contexto.projetos.map((projeto) => projeto.nome)).toEqual(['c1']);
    expect(pedidos[0]!.instrucoes).toContain('SOP é prioridade');
    expect(pedidos[0]!.modelo).toBe('gemini-3.5-flash-lite');
  });

  it('sem projetos com atividades, explica em vez de chamar a IA', async () => {
    const armazenamento = {
      obter: async () => 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123',
      salvar: async () => undefined,
      remover: async () => undefined,
      obterModelo: async () => null,
      salvarModelo: async () => undefined,
    };
    const modelo = { testar: async () => undefined } as unknown as ModeloDeAnalise;
    await expect(
      new AnalisarPortfolio({
        cofre: armazenamento,
        configuracao: armazenamento,
        modelo,
        consultaDeAvs: { relatorio: async () => [] },
        consultaDeCronograma: {
          obterResumo: async (id) => resumo(id),
          listarIdsAtivos: async () => ['c1'],
        },
        consultaDeEstrutura: { obterEstrutura: async () => estrutura([]) },
        instrucoes: new InstrucoesFalsas(),
        arquivo: new ArquivoDeAnalisesEmMemoria(),
        quemEstaUsando: { nomeDoUsuarioAtual: () => null },
        geradorDeId: new GeradorDeIdSequencial(),
        relogio,
      }).executar(),
    ).rejects.toThrow(ErroNaIa);
  });
});
