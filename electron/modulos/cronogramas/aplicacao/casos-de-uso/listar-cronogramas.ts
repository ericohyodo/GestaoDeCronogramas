import type { CronogramaDTO } from '@contratos/cronogramas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioCronogramas } from '../../dominio/repositorio-cronogramas';
import { paraCronogramaDTO } from '../mapeador-dto';

export class ListarCronogramas implements CasoDeUso<void, CronogramaDTO[]> {
  constructor(private readonly repositorio: RepositorioCronogramas) {}

  async executar(): Promise<CronogramaDTO[]> {
    const cronogramas = await this.repositorio.listar();
    return cronogramas.map(paraCronogramaDTO);
  }
}
