import type { SecaoProcessoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioSecaoProcesso } from '../../dominio/repositorio-secao-processo';
import { paraSecaoProcessoDTO } from '../mapeador-produto-processo-dto';

export class ObterSecaoProcesso implements CasoDeUso<string, SecaoProcessoDTO> {
  constructor(private readonly repositorio: RepositorioSecaoProcesso) {}

  async executar(avId: string): Promise<SecaoProcessoDTO> {
    return paraSecaoProcessoDTO(await this.repositorio.obter(avId));
  }
}
