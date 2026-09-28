import type { SecaoCustoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioSecaoCusto } from '../../dominio/repositorio-secao-custo';
import { paraSecaoCustoDTO } from '../mapeador-custo-dto';

export class ObterSecaoCusto implements CasoDeUso<string, SecaoCustoDTO> {
  constructor(private readonly repositorio: RepositorioSecaoCusto) {}

  async executar(avId: string): Promise<SecaoCustoDTO> {
    return paraSecaoCustoDTO(await this.repositorio.obter(avId));
  }
}
