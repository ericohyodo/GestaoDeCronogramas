import { describe, expect, it } from 'vitest';
import { Periodo } from '../../../electron/nucleo/dominio/periodo';
import {
  calcularCronograma,
  sucessorasTransitivas,
  validarSemCiclo,
} from '../../../electron/modulos/tarefas/dominio/servicos/calculo-do-cronograma';
import { Tarefa } from '../../../electron/modulos/tarefas/dominio/tarefa';

const agora = new Date('2026-09-22T12:00:00.000Z');

function tarefa(id: string, inicio: string, fim: string, dependencias: string[] = []): Tarefa {
  const criada = Tarefa.criar({
    id,
    cronogramaId: 'cron-1',
    titulo: id,
    periodo: Periodo.criar(inicio, fim),
    ordem: 1,
    agora,
  });
  if (dependencias.length > 0) criada.definirDependencias(dependencias, agora);
  return criada;
}

describe('Cálculo do cronograma', () => {
  it('marca como crítica a cadeia que define o fim do projeto', () => {
    // A → B → C termina em 30/10 (fim do projeto); D é um ramo curto e folgado.
    const tarefas = [
      tarefa('a', '2026-10-01', '2026-10-10'),
      tarefa('b', '2026-10-11', '2026-10-20', ['a']),
      tarefa('c', '2026-10-21', '2026-10-30', ['b']),
      tarefa('d', '2026-10-11', '2026-10-15', ['a']),
    ];

    const { criticas, folgaPorTarefa } = calcularCronograma(tarefas);

    expect([...criticas].sort()).toEqual(['a', 'b', 'c']);
    expect(folgaPorTarefa.get('d')).toBe(15);
  });

  it('acusa conflito quando a tarefa começa antes do fim da predecessora', () => {
    const tarefas = [
      tarefa('a', '2026-10-01', '2026-10-10'),
      tarefa('b', '2026-10-08', '2026-10-20', ['a']),
    ];

    expect([...calcularCronograma(tarefas).conflitos]).toEqual(['b']);
  });

  it('não trava com uma única tarefa nem com lista vazia', () => {
    expect(calcularCronograma([]).criticas.size).toBe(0);
    const uma = calcularCronograma([tarefa('a', '2026-10-01', '2026-10-10')]);
    expect(uma.criticas.has('a')).toBe(true);
    expect(uma.folgaPorTarefa.get('a')).toBe(0);
  });

  it('lista as sucessoras diretas e indiretas', () => {
    const tarefas = [
      tarefa('a', '2026-10-01', '2026-10-02'),
      tarefa('b', '2026-10-03', '2026-10-04', ['a']),
      tarefa('c', '2026-10-05', '2026-10-06', ['b']),
      tarefa('d', '2026-10-05', '2026-10-06'),
    ];

    expect([...sucessorasTransitivas('a', tarefas)].sort()).toEqual(['b', 'c']);
    expect(sucessorasTransitivas('d', tarefas).size).toBe(0);
  });

  it('barra dependência circular', () => {
    const tarefas = [
      tarefa('a', '2026-10-01', '2026-10-02'),
      tarefa('b', '2026-10-03', '2026-10-04', ['a']),
      tarefa('c', '2026-10-05', '2026-10-06', ['b']),
    ];

    expect(() => validarSemCiclo('a', ['c'], tarefas)).toThrow(/ciclo/i);
    expect(() => validarSemCiclo('d', ['a'], tarefas)).not.toThrow();
  });
});
