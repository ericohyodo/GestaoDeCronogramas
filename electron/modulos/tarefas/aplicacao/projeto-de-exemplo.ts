import type { GeradorDeId } from '../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../nucleo/aplicacao/portas/relogio';
import { Periodo } from '../../../nucleo/dominio/periodo';
import { Fase } from '../dominio/fase';
import type { RepositorioFases } from '../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../dominio/repositorio-tarefas';
import { Tarefa } from '../dominio/tarefa';

/** Soma dias a uma data AAAA-MM-DD. */
const somar = (iso: string, dias: number) => {
  const data = new Date(`${iso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
};

// [fase, tarefa, início (dias após o início do projeto), duração, % concluído, predecessora (índice)]
const ROTEIRO: [string, string, number, number, number, number | null][] = [
  ['Kick-off e planejamento', 'Reunião de kick-off com o cliente', -30, 2, 100, null],
  ['Kick-off e planejamento', 'Plano do projeto e cronograma macro', -28, 5, 100, 0],
  ['Engenharia de produto', 'Desenhos 2D/3D liberados', -22, 10, 100, 1],
  ['Engenharia de produto', 'Análise de tolerâncias', -12, 6, 80, 2],
  ['Engenharia de processo', 'Projeto do ferramental', -10, 15, 40, 2],
  ['Engenharia de processo', 'Fabricação do ferramental', 3, 20, 0, 4],
  ['Engenharia de processo', 'Try-out do ferramental', 24, 4, 0, 5],
  ['Validação', 'Amostras para o cliente (PPAP)', 29, 8, 0, 6],
  ['Validação', 'Aprovação do cliente', 38, 5, 0, 7],
  ['Produção', 'Lote piloto', 44, 6, 0, 8],
  ['Produção', 'Início de produção (SOP)', 51, 1, 0, 9],
];

/**
 * Projeto fictício para o modo apresentação: fases, tarefas encadeadas por dependência, uma tarefa
 * atrasada, uma vencendo e o restante no futuro, com responsáveis em rodízio.
 * @param dados.inicioIso dia de referência ("hoje" da apresentação)
 */
export async function semearProjetoDeExemplo(
  tarefas: RepositorioTarefas,
  fases: RepositorioFases,
  ids: GeradorDeId,
  relogio: Relogio,
  dados: { cronogramaId: string; responsavelIds: string[]; inicioIso: string },
): Promise<void> {
  const agora = relogio.agora();
  const faseDoNome = new Map<string, Fase>();
  const criadas: Tarefa[] = [];
  let ordemDaFase = 0;
  const ordemNaFase = new Map<string, number>();

  for (const [indice, [nomeDaFase, titulo, inicio, duracao, percentual, predecessora]] of ROTEIRO.entries()) {
    let fase = faseDoNome.get(nomeDaFase);
    if (!fase) {
      ordemDaFase += 1;
      fase = Fase.criar({ id: ids.gerar(), cronogramaId: dados.cronogramaId, nome: nomeDaFase, ordem: ordemDaFase, agora });
      await fases.salvar(fase);
      faseDoNome.set(nomeDaFase, fase);
    }
    const ordem = (ordemNaFase.get(fase.id) ?? 0) + 1;
    ordemNaFase.set(fase.id, ordem);
    const tarefa = Tarefa.criar({
      id: ids.gerar(),
      cronogramaId: dados.cronogramaId,
      faseId: fase.id,
      titulo,
      periodo: Periodo.criar(somar(dados.inicioIso, inicio), somar(dados.inicioIso, inicio + duracao - 1)),
      responsavelId: dados.responsavelIds.length ? dados.responsavelIds[indice % dados.responsavelIds.length]! : null,
      ordem,
      agora,
    });
    if (percentual > 0) tarefa.registrarProgresso(percentual, agora);
    if (predecessora !== null) tarefa.definirDependencias([criadas[predecessora]!.id], agora);
    criadas.push(tarefa);
  }
  await tarefas.salvarVarias(criadas);
}
