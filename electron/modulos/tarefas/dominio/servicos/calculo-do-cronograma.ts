import { ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import { diasEntreDatas, somarDiasNaData } from '../../../../nucleo/dominio/periodo';
import type { Tarefa } from '../tarefa';

export interface ResultadoDoCalculo {
  /** Dias de folga até a data mais tarde possível sem atrasar o fim do projeto. */
  folgaPorTarefa: Map<string, number>;
  /** Folga zero: qualquer atraso empurra o fim do projeto. */
  criticas: Set<string>;
  /** Tarefas que começam antes do fim de alguma predecessora. */
  conflitos: Set<string>;
}

/**
 * Caminho crítico sobre as datas informadas (as datas continuam sendo digitadas por quem planeja).
 * Passagem para trás: a data mais tarde de término de uma tarefa é limitada pelo início das
 * sucessoras e, na ponta, pelo fim do projeto. Folga zero marca o caminho crítico.
 */
export function calcularCronograma(tarefas: readonly Tarefa[]): ResultadoDoCalculo {
  const porId = new Map(tarefas.map((tarefa) => [tarefa.id, tarefa]));
  const sucessoras = new Map<string, string[]>(tarefas.map((tarefa) => [tarefa.id, []]));
  for (const tarefa of tarefas) {
    for (const predecessora of tarefa.dependencias) {
      sucessoras.get(predecessora)?.push(tarefa.id);
    }
  }

  const fimDoProjeto = tarefas.reduce(
    (maior, tarefa) => (tarefa.periodo.fim > maior ? tarefa.periodo.fim : maior),
    tarefas[0]?.periodo.fim ?? '',
  );

  const folgaPorTarefa = new Map<string, number>();
  const criticas = new Set<string>();
  const conflitos = new Set<string>();

  // Da última para a primeira: uma tarefa só é calculada depois de todas as suas sucessoras.
  for (const id of ordenarDasFolhasParaARaiz(porId, sucessoras)) {
    const tarefa = porId.get(id);
    if (!tarefa) continue;

    let terminoMaisTarde = fimDoProjeto;
    for (const idSucessora of sucessoras.get(id) ?? []) {
      const sucessora = porId.get(idSucessora);
      if (!sucessora) continue;
      const folgaDaSucessora = folgaPorTarefa.get(idSucessora) ?? 0;
      // Início mais tarde da sucessora menos um dia: é o limite para esta terminar.
      const limite = somarDiasNaData(sucessora.periodo.inicio, folgaDaSucessora - 1);
      if (limite < terminoMaisTarde) terminoMaisTarde = limite;
    }

    const folga = Math.max(0, diasEntreDatas(tarefa.periodo.fim, terminoMaisTarde));
    folgaPorTarefa.set(id, folga);
    if (folga === 0) criticas.add(id);

    for (const idPredecessora of tarefa.dependencias) {
      const predecessora = porId.get(idPredecessora);
      if (predecessora && tarefa.periodo.inicio <= predecessora.periodo.fim) conflitos.add(id);
    }
  }

  return { folgaPorTarefa, criticas, conflitos };
}

/** Sucessoras diretas e indiretas de uma tarefa. */
export function sucessorasTransitivas(
  idInicial: string,
  tarefas: readonly Tarefa[],
): Set<string> {
  const sucessorasDiretas = new Map<string, string[]>();
  for (const tarefa of tarefas) {
    for (const predecessora of tarefa.dependencias) {
      const lista = sucessorasDiretas.get(predecessora) ?? [];
      lista.push(tarefa.id);
      sucessorasDiretas.set(predecessora, lista);
    }
  }

  const encontradas = new Set<string>();
  const fila = [...(sucessorasDiretas.get(idInicial) ?? [])];
  while (fila.length > 0) {
    const id = fila.shift() as string;
    if (encontradas.has(id)) continue;
    encontradas.add(id);
    fila.push(...(sucessorasDiretas.get(id) ?? []));
  }
  return encontradas;
}

/**
 * Impede dependência circular (A depende de B que depende de A), que travaria o cálculo.
 * `novasDependencias` é o conjunto que a tarefa passaria a ter.
 */
export function validarSemCiclo(
  tarefaId: string,
  novasDependencias: readonly string[],
  tarefas: readonly Tarefa[],
): void {
  const dependenciasPorTarefa = new Map<string, readonly string[]>(
    tarefas.map((tarefa) => [tarefa.id, tarefa.dependencias]),
  );
  dependenciasPorTarefa.set(tarefaId, novasDependencias);

  const visitando = new Set<string>();
  const concluidas = new Set<string>();

  const visitar = (id: string): void => {
    if (concluidas.has(id)) return;
    if (visitando.has(id)) {
      throw new ErroDeValidacao(
        'Esta dependência criaria um ciclo: a tarefa passaria a depender dela mesma.',
      );
    }
    visitando.add(id);
    for (const predecessora of dependenciasPorTarefa.get(id) ?? []) visitar(predecessora);
    visitando.delete(id);
    concluidas.add(id);
  };

  visitar(tarefaId);
}

/** Ordem topológica invertida (sucessoras antes das predecessoras). */
function ordenarDasFolhasParaARaiz(
  porId: Map<string, Tarefa>,
  sucessoras: Map<string, string[]>,
): string[] {
  const pendentes = new Map<string, number>(
    [...porId.keys()].map((id) => [id, (sucessoras.get(id) ?? []).length]),
  );
  const fila = [...pendentes.entries()].filter(([, grau]) => grau === 0).map(([id]) => id);
  const ordem: string[] = [];
  const incluidas = new Set<string>();

  while (fila.length > 0) {
    const id = fila.shift() as string;
    ordem.push(id);
    incluidas.add(id);
    for (const predecessora of porId.get(id)?.dependencias ?? []) {
      const restante = (pendentes.get(predecessora) ?? 0) - 1;
      pendentes.set(predecessora, restante);
      if (restante === 0) fila.push(predecessora);
    }
  }

  // Sobrou algo? Só acontece com ciclo (barrado na escrita); entra no fim para não travar o cálculo.
  for (const id of porId.keys()) if (!incluidas.has(id)) ordem.push(id);
  return ordem;
}
