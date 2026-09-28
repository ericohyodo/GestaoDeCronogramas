import { beforeEach, describe, expect, it } from 'vitest';
import { AjustarDatasDaFase } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/ajustar-datas-da-fase';
import { CriarTarefa } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/criar-tarefa';
import { CriarFase } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/gerenciar-fases';
import { ErroNaoEncontrado } from '../../../electron/nucleo/aplicacao/erros';
import { ErroDeValidacao } from '../../../electron/nucleo/dominio/erro-de-dominio';
import {
  ConsultaDeCronogramasFalsa,
  ConsultaDeResponsaveisFalsa,
  GeradorDeIdSequencial,
  RelogioFixo,
  RepositorioFasesEmMemoria,
  RepositorioTarefasEmMemoria,
} from '../../dubles/dubles';

describe('AjustarDatasDaFase', () => {
  let tarefas: RepositorioTarefasEmMemoria;
  let fases: RepositorioFasesEmMemoria;
  let criarFase: CriarFase;
  let criarTarefa: CriarTarefa;
  let ajustar: AjustarDatasDaFase;

  beforeEach(() => {
    tarefas = new RepositorioTarefasEmMemoria();
    fases = new RepositorioFasesEmMemoria();
    const relogio = new RelogioFixo();
    const geradorDeId = new GeradorDeIdSequencial('x');
    const consultaDeCronogramas = new ConsultaDeCronogramasFalsa();
    criarFase = new CriarFase(fases, tarefas, consultaDeCronogramas, relogio, geradorDeId);
    criarTarefa = new CriarTarefa(
      tarefas,
      fases,
      consultaDeCronogramas,
      new ConsultaDeResponsaveisFalsa(),
      relogio,
      geradorDeId,
    );
    ajustar = new AjustarDatasDaFase(tarefas, fases, relogio);
  });

  it('dá o mesmo início e término a todas as tarefas da fase, e só a elas', async () => {
    await criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase 1', quantidadeDeSubtarefas: 3 });
    await criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase 2', quantidadeDeSubtarefas: 2 });
    const solta = await criarTarefa.executar({
      cronogramaId: 'cron-1',
      titulo: 'Solta',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-05',
    });
    const [fase1, fase2] = await fases.listarPorCronograma('cron-1');
    const antesDaFase2 = (await tarefas.listarPorCronograma('cron-1'))
      .filter((tarefa) => tarefa.faseId === fase2!.id)
      .map((tarefa) => tarefa.periodo);

    const ajustadas = await ajustar.executar({
      faseId: fase1!.id,
      dataInicio: '2026-11-03',
      dataFim: '2026-11-20',
    });

    expect(ajustadas).toBe(3);
    const todas = await tarefas.listarPorCronograma('cron-1');
    const daFase1 = todas.filter((tarefa) => tarefa.faseId === fase1!.id);
    expect(daFase1).toHaveLength(3);
    for (const tarefa of daFase1) {
      expect(tarefa.periodo).toMatchObject({ inicio: '2026-11-03', fim: '2026-11-20' });
    }
    expect(todas.filter((tarefa) => tarefa.faseId === fase2!.id).map((tarefa) => tarefa.periodo)).toEqual(antesDaFase2);
    expect((await tarefas.obterPorId(solta.id))?.periodo).toMatchObject({ inicio: '2026-10-01', fim: '2026-10-05' });
  });

  it('não mexe no progresso nem na data efetiva das tarefas', async () => {
    await criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase 1', quantidadeDeSubtarefas: 1 });
    const [fase] = await fases.listarPorCronograma('cron-1');
    const [tarefa] = await tarefas.listarPorCronograma('cron-1');
    tarefa!.registrarProgresso(100, new Date());
    tarefa!.registrarDataEfetiva('2026-10-09', new Date());
    await tarefas.salvar(tarefa!);

    await ajustar.executar({ faseId: fase!.id, dataInicio: '2026-11-03', dataFim: '2026-11-20' });

    expect(await tarefas.obterPorId(tarefa!.id)).toMatchObject({ percentualConcluido: 100, dataEfetiva: '2026-10-09' });
  });

  it('recusa período invertido e fase inexistente', async () => {
    await criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase 1', quantidadeDeSubtarefas: 1 });
    const [fase] = await fases.listarPorCronograma('cron-1');

    await expect(
      ajustar.executar({ faseId: fase!.id, dataInicio: '2026-11-20', dataFim: '2026-11-03' }),
    ).rejects.toThrow(ErroDeValidacao);
    await expect(
      ajustar.executar({ faseId: 'nao-existe', dataInicio: '2026-11-03', dataFim: '2026-11-20' }),
    ).rejects.toThrow(ErroNaoEncontrado);
  });
});
