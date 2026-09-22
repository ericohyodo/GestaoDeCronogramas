import type { CronogramaDTO } from '@contratos/cronogramas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioCronogramas } from '../../dominio/repositorio-cronogramas';
import { paraCronogramaDTO } from '../mapeador-dto';

export class ObterCronograma implements CasoDeUso<string, CronogramaDTO> {
  constructor(private readonly repositorio: RepositorioCronogramas) {}

  async executar(id: string): Promise<CronogramaDTO> {
    const cronograma = await this.repositorio.obterPorId(id);
    if (!cronograma) throw new ErroNaoEncontrado('Cronograma');
    return paraCronogramaDTO(cronograma);
  }
}
