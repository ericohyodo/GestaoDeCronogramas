import { beforeEach, describe, expect, it } from 'vitest';
import { ErroNaoEncontrado } from '../../../electron/nucleo/aplicacao/erros';
import { ErroDeValidacao } from '../../../electron/nucleo/dominio/erro-de-dominio';
import { AtualizarTarefa } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/atualizar-tarefa';
import { CriarTarefa } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/criar-tarefa';
import { DeslocarSucessoras } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/deslocar-sucessoras';
import {
  ConsultaDeCronogramasFalsa,
  ConsultaDeResponsaveisFalsa,
  GeradorDeIdSequencial,
  RelogioFixo,
  RepositorioFasesEmMemoria,
  RepositorioTarefasEmMemoria,
} from '../../dubles/dubles';

describe('Casos de uso de tarefas', () => {
  let repositorio: RepositorioTarefasEmMemoria;
  let repositorioFases: RepositorioFasesEmMemoria;
  let relogio: RelogioFixo;
  let criarTarefa: CriarTarefa;
  let atualizarTarefa: AtualizarTarefa;
  const consultaDeCronogramas = new ConsultaDeCronogramasFalsa();
  const consultaDeResponsaveis = new ConsultaDeResponsaveisFalsa();

  beforeEach(() => {
    repositorio = new RepositorioTarefasEmMemoria();
    repositorioFases = new RepositorioFasesEmMemoria();
    relogio = new RelogioFixo();
    criarTarefa = new CriarTarefa(
      repositorio,
      repositorioFases,
      consultaDeCronogramas,
      consultaDeResponsaveis,
      relogio,
      new GeradorDeIdSequencial('t'),
    );
    atualizarTarefa = new AtualizarTarefa(repositorio, consultaDeResponsaveis, relogio);
  });

  const entrada = (titulo: string, dataInicio = '2026-10-01', dataFim = '2026-10-05') => ({
    cronogramaId: 'cron-1',
    titulo,
    dataInicio,
    dataFim,
  });

  it('cria tarefas pendentes com ordem sequencial no cronograma', async () => {
    const primeira = await criarTarefa.executar(entrada('Levantamento'));
    const segunda = await criarTarefa.executar(entrada('Projeto'));

    expect(primeira).toMatchObject({
      ordem: 1,
      situacao: 'pendente',
      percentualConcluido: 0,
      duracaoEmDias: 5,
      faseId: null,
      responsavelId: null,
      dependencias: [],
    });
    expect(segunda.ordem).toBe(2);
  });

  it('usa a porta do módulo de cronogramas para validar o cronograma', async () => {
    await expect(
      criarTarefa.executar({ ...entrada('Órfã'), cronogramaId: 'inexistente' }),
    ).rejects.toThrow(ErroNaoEncontrado);
  });

  it('recusa responsável inexistente', async () => {
    await expect(
      criarTarefa.executar({ ...entrada('Com responsável'), responsavelId: 'resp-9' }),
    ).rejects.toThrow(ErroNaoEncontrado);

    const aceita = await criarTarefa.executar({
      ...entrada('Com responsável'),
      responsavelId: 'resp-1',
    });
    expect(aceita.responsavelId).toBe('resp-1');
  });

  it('registra progresso e situação', async () => {
    const { id } = await criarTarefa.executar(entrada('Execução'));
    const { tarefa } = await atualizarTarefa.executar({
      id,
      percentualConcluido: 60,
      situacao: 'em_andamento',
    });
    expect(tarefa).toMatchObject({ percentualConcluido: 60, situacao: 'em_andamento' });
  });

  it.each([-1, 101, 12.5])('rejeita percentual %s', async (percentual) => {
    const { id } = await criarTarefa.executar(entrada('Execução'));
    await expect(
      atualizarTarefa.executar({ id, percentualConcluido: percentual }),
    ).rejects.toThrow(ErroDeValidacao);
  });

  describe('dependências', () => {
    it('recusa predecessora de outro cronograma e dependência circular', async () => {
      const a = await criarTarefa.executar(entrada('A'));
      const b = await criarTarefa.executar(entrada('B', '2026-10-06', '2026-10-10'));

      await expect(
        atualizarTarefa.executar({ id: b.id, dependencias: ['tarefa-de-outro'] }),
      ).rejects.toThrow(ErroDeValidacao);

      await atualizarTarefa.executar({ id: b.id, dependencias: [a.id] });
      await expect(
        atualizarTarefa.executar({ id: a.id, dependencias: [b.id] }),
      ).rejects.toThrow(/ciclo/i);
    });

    it('avisa quais sucessoras podem ser deslocadas quando o término atrasa', async () => {
      const a = await criarTarefa.executar(entrada('A'));
      const b = await criarTarefa.executar(entrada('B', '2026-10-06', '2026-10-10'));
      const c = await criarTarefa.executar(entrada('C', '2026-10-12', '2026-10-15'));
      await atualizarTarefa.executar({ id: b.id, dependencias: [a.id] });
      await atualizarTarefa.executar({ id: c.id, dependencias: [b.id] });

      const semAtraso = await atualizarTarefa.executar({ id: a.id, titulo: 'A renomeada' });
      expect(semAtraso.impacto).toBeNull();

      const comAtraso = await atualizarTarefa.executar({ id: a.id, dataFim: '2026-10-08' });
      expect(comAtraso.impacto).toEqual({
        diasDeAtraso: 3,
        sucessoras: [
          { id: b.id, titulo: 'B' },
          { id: c.id, titulo: 'C' },
        ],
      });
    });

    it('desloca todas as sucessoras pelo mesmo número de dias', async () => {
      const a = await criarTarefa.executar(entrada('A'));
      const b = await criarTarefa.executar(entrada('B', '2026-10-06', '2026-10-10'));
      const c = await criarTarefa.executar(entrada('C', '2026-10-12', '2026-10-15'));
      await atualizarTarefa.executar({ id: b.id, dependencias: [a.id] });
      await atualizarTarefa.executar({ id: c.id, dependencias: [b.id] });

      await new DeslocarSucessoras(repositorio, relogio).executar({ tarefaId: a.id, dias: 3 });

      const tarefas = await repositorio.listarPorCronograma('cron-1');
      expect(tarefas.map((t) => [t.titulo, t.periodo.inicio, t.periodo.fim])).toEqual([
        ['A', '2026-10-01', '2026-10-05'],
        ['B', '2026-10-09', '2026-10-13'],
        ['C', '2026-10-15', '2026-10-18'],
      ]);
    });
  });
});
