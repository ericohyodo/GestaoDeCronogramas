import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioCronogramas } from '../../dominio/repositorio-cronogramas';

export class ExcluirCronograma implements CasoDeUso<string, null> {
  constructor(private readonly repositorio: RepositorioCronogramas) {}

  async executar(id: string): Promise<null> {
    if (!(await this.repositorio.existe(id))) throw new ErroNaoEncontrado('Cronograma');
    await this.repositorio.excluir(id);
    return null;
  }
}
