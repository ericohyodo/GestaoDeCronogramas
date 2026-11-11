import type { RepositorioFases } from '../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../dominio/repositorio-tarefas';

/**
 * Desce uma posição tudo o que está a partir de `aPartirDe` no mesmo nível, abrindo espaço para inserir
 * uma tarefa nessa posição. Dentro de uma fase, só as tarefas da fase descem; no nível de topo (tarefa
 * solta), as fases dividem a mesma numeração e descem junto.
 * @param cronogramaId cronograma da inserção
 * @param faseId fase da inserção (`null` = tarefa solta, no topo)
 * @param aPartirDe primeira ordem que precisa descer
 */
export async function abrirEspacoNaOrdem(
  tarefas: RepositorioTarefas,
  fases: RepositorioFases,
  cronogramaId: string,
  faseId: string | null,
  aPartirDe: number,
): Promise<void> {
  const desce = (item: { id: string; ordem: number }) => ({ id: item.id, ordem: item.ordem + 1 });
  const atingida = (item: { ordem: number }) => item.ordem >= aPartirDe;

  const irmas = (await tarefas.listarPorCronograma(cronogramaId)).filter(
    (tarefa) => tarefa.faseId === faseId && atingida(tarefa),
  );
  await tarefas.atualizarOrdens(irmas.map(desce));
  if (faseId === null) {
    const doTopo = (await fases.listarPorCronograma(cronogramaId)).filter(atingida);
    await fases.atualizarOrdens(doTopo.map(desce));
  }
}
