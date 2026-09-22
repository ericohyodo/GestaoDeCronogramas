import type { PreferenciasDTO } from '@contratos/preferencias.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioPreferencias } from '../../dominio/repositorio-preferencias';
import { TEMA_PADRAO } from '../../dominio/tema';

export class ObterPreferencias implements CasoDeUso<void, PreferenciasDTO> {
  constructor(private readonly repositorio: RepositorioPreferencias) {}

  async executar(): Promise<PreferenciasDTO> {
    return { tema: (await this.repositorio.obterTema()) ?? TEMA_PADRAO };
  }
}
