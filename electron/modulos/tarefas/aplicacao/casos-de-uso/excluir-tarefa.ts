import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';

export class ExcluirTarefa implements CasoDeUso<string, null> {
  constructor(private readonly repositorio: RepositorioTarefas) {}

  async executar(id: string): Promise<null> {
    if (!(await this.repositorio.obterPorId(id))) throw new ErroNaoEncontrado('Tarefa');
    await this.repositorio.excluir(id);
    return null;
  }
}
