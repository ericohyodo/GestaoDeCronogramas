import { beforeEach, describe, expect, it } from 'vitest';
import { CriarTarefa } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/criar-tarefa';
import { CriarFase, ExcluirFase } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/gerenciar-fases';
import { ObterEstrutura } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/obter-estrutura';
import { AtualizarTarefa } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/atualizar-tarefa';
import { ErroDeValidacao } from '../../../electron/nucleo/dominio/erro-de-dominio';
import {
  ConsultaDeCronogramasFalsa,
  ConsultaDeResponsaveisFalsa,
  GeradorDeIdSequencial,
  RelogioFixo,
  RepositorioFasesEmMemoria,
  RepositorioTarefasEmMemoria,
} from '../../dubles/dubles';

describe('Fases e estrutura analítica', () => {
  let tarefas: RepositorioTarefasEmMemoria;
  let fases: RepositorioFasesEmMemoria;
  let criarFase: CriarFase;
  let criarTarefa: CriarTarefa;
  let atualizarTarefa: AtualizarTarefa;
  let obterEstrutura: ObterEstrutura;
  const consultaDeCronogramas = new ConsultaDeCronogramasFalsa();
  const consultaDeResponsaveis = new ConsultaDeResponsaveisFalsa();

  beforeEach(() => {
    tarefas = new RepositorioTarefasEmMemoria();
    fases = new RepositorioFasesEmMemoria();
    const relogio = new RelogioFixo();
    const geradorDeId = new GeradorDeIdSequencial('x');
    criarFase = new CriarFase(fases, tarefas, consultaDeCronogramas, relogio, geradorDeId);
    criarTarefa = new CriarTarefa(
      tarefas,
      fases,
      consultaDeCronogramas,
      consultaDeResponsaveis,
      relogio,
      geradorDeId,
    );
    atualizarTarefa = new AtualizarTarefa(tarefas, consultaDeResponsaveis, relogio);
    obterEstrutura = new ObterEstrutura(
      tarefas,
      fases,
      consultaDeCronogramas,
      consultaDeResponsaveis,
    );
  });

  it('cria a fase já com as subtarefas em branco, dentro do período do cronograma', async () => {
    await criarFase.executar({
      cronogramaId: 'cron-1',
      nome: 'Fase 1 APQP',
      quantidadeDeSubtarefas: 8,
    });

    const criadas = await tarefas.listarPorCronograma('cron-1');
    expect(criadas).toHaveLength(8);
    expect(criadas.map((tarefa) => tarefa.titulo)).toEqual([
      'Tarefa 1',
      'Tarefa 2',
      'Tarefa 3',
      'Tarefa 4',
      'Tarefa 5',
      'Tarefa 6',
      'Tarefa 7',
      'Tarefa 8',
    ]);
    expect(criadas[0]?.periodo).toMatchObject({ inicio: '2026-10-01', fim: '2026-10-07' });
    expect(new Set(criadas.map((tarefa) => tarefa.faseId)).size).toBe(1);
  });

  it.each([-1, 51, 2.5])('recusa quantidade inválida de subtarefas (%s)', async (quantidade) => {
    await expect(
      criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase', quantidadeDeSubtarefas: quantidade }),
    ).rejects.toThrow(ErroDeValidacao);
  });

  it('numera em WBS, indenta as subtarefas e resume a fase', async () => {
    await criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase 1 APQP', quantidadeDeSubtarefas: 2 });
    const [primeira, segunda] = await tarefas.listarPorCronograma('cron-1');
    await atualizarTarefa.executar({
      id: primeira!.id,
      titulo: 'Escopo',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-10',
      percentualConcluido: 100,
      responsavelId: 'resp-1',
    });
    await atualizarTarefa.executar({
      id: segunda!.id,
      titulo: 'Cronograma detalhado',
      dataInicio: '2026-10-11',
      dataFim: '2026-10-20',
      dependencias: [primeira!.id],
    });
    await criarTarefa.executar({
      cronogramaId: 'cron-1',
      titulo: 'Tarefa solta',
      dataInicio: '2026-10-21',
      dataFim: '2026-10-25',
    });

    const estrutura = await obterEstrutura.executar('cron-1');

    expect(estrutura.linhas.map((linha) => [linha.numero, linha.nivel, linha.titulo])).toEqual([
      ['1', 0, 'Fase 1 APQP'],
      ['1.1', 1, 'Escopo'],
      ['1.2', 1, 'Cronograma detalhado'],
      ['2', 0, 'Tarefa solta'],
    ]);

    const fase = estrutura.linhas[0]!;
    expect(fase).toMatchObject({
      tipo: 'fase',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-20',
      duracaoEmDias: 20,
      percentualConcluido: 50, // 100% de 10 dias e 0% de 10 dias
    });

    expect(estrutura.linhas[2]).toMatchObject({
      dependenciasNumeros: ['1.1'],
      responsavelNome: null,
      conflitoDeDependencia: false,
    });
    expect(estrutura.linhas[1]?.responsavelNome).toBe('Ana Souza');
    // A janela vai do início ao fim do projeto (01/10 a 31/12), mesmo com as tarefas terminando antes.
    expect(estrutura).toMatchObject({ inicio: '2026-10-01', fim: '2026-12-31' });
  });

  it('usa o período do cronograma quando ainda não há tarefas', async () => {
    const estrutura = await obterEstrutura.executar('cron-1');
    expect(estrutura).toMatchObject({ inicio: '2026-10-01', fim: '2026-12-31', linhas: [] });
  });

  it('estica a janela quando uma tarefa passa do fim do projeto', async () => {
    await criarTarefa.executar({
      cronogramaId: 'cron-1',
      titulo: 'Fora do prazo',
      dataInicio: '2026-12-20',
      dataFim: '2027-01-15',
    });
    expect(await obterEstrutura.executar('cron-1')).toMatchObject({ fim: '2027-01-15' });
  });

  it('excluir a fase leva junto as subtarefas (cascata do banco simulada)', async () => {
    await criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase 1', quantidadeDeSubtarefas: 3 });
    const fase = (await fases.listarPorCronograma('cron-1'))[0]!;

    await new ExcluirFase(fases).executar(fase.id);

    expect(await fases.listarPorCronograma('cron-1')).toHaveLength(0);
  });
});
