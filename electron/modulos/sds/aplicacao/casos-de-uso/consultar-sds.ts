import type { SdDTO } from '@contratos/sds.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioSds } from '../../dominio/repositorio-sds';
import { paraSdDTO } from '../mapeador-dto';

export class ListarSds implements CasoDeUso<void, SdDTO[]> {
  constructor(private readonly repositorio: RepositorioSds) {}

  async executar(): Promise<SdDTO[]> {
    return (await this.repositorio.listar()).map(paraSdDTO);
  }
}

export class ObterSdPorAv implements CasoDeUso<string, SdDTO | null> {
  constructor(private readonly repositorio: RepositorioSds) {}

  async executar(avId: string): Promise<SdDTO | null> {
    const encontrada = await this.repositorio.obterPorAv(avId);
    return encontrada ? paraSdDTO(encontrada) : null;
  }
}
