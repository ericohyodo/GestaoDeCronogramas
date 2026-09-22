import type { PreferenciasDTO } from '@contratos/preferencias.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioPreferencias } from '../../dominio/repositorio-preferencias';
import { validarTema } from '../../dominio/tema';
import type { AplicadorDeTema } from '../portas/aplicador-de-tema';

export class DefinirTema implements CasoDeUso<string, PreferenciasDTO> {
  constructor(
    private readonly repositorio: RepositorioPreferencias,
    private readonly aplicadorDeTema: AplicadorDeTema,
  ) {}

  async executar(valor: string): Promise<PreferenciasDTO> {
    const tema = validarTema(valor);
    await this.repositorio.salvarTema(tema);
    this.aplicadorDeTema.aplicar(tema);
    return { tema };
  }
}
