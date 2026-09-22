import type { ReordenarTarefasEntrada } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';

export class ReordenarTarefas implements CasoDeUso<ReordenarTarefasEntrada, null> {
  constructor(private readonly repositorio: RepositorioTarefas) {}

  async executar(entrada: ReordenarTarefasEntrada): Promise<null> {
    await this.repositorio.atualizarOrdens(entrada.ordens);
    return null;
  }
}
