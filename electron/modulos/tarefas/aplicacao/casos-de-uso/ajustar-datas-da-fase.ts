import type { AjustarDatasDaFaseEntrada } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { Periodo } from '../../../../nucleo/dominio/periodo';
import type { RepositorioFases } from '../../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';

/**
 * Dá a todas as tarefas da fase o mesmo início e término, para que a primeira comece com a fase e
 * a última termine com ela. O encadeamento e as durações são refinados depois, tarefa a tarefa.
 * Devolve quantas tarefas foram ajustadas.
 */
export class AjustarDatasDaFase implements CasoDeUso<AjustarDatasDaFaseEntrada, number> {
  constructor(
    private readonly repositorio: RepositorioTarefas,
    private readonly repositorioFases: RepositorioFases,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: AjustarDatasDaFaseEntrada): Promise<number> {
    const periodo = Periodo.criar(entrada.dataInicio, entrada.dataFim);

    const fase = await this.repositorioFases.obterPorId(entrada.faseId);
    if (!fase) throw new ErroNaoEncontrado('Fase');

    const tarefas = (await this.repositorio.listarPorCronograma(fase.cronogramaId)).filter(
      (tarefa) => tarefa.faseId === fase.id,
    );
    const agora = this.relogio.agora();
    for (const tarefa of tarefas) tarefa.alterarPeriodo(periodo, agora);
    await this.repositorio.salvarVarias(tarefas);

    return tarefas.length;
  }
}
