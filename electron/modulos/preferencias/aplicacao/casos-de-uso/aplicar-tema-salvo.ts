import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioPreferencias } from '../../dominio/repositorio-preferencias';
import { TEMA_PADRAO } from '../../dominio/tema';
import type { AplicadorDeTema } from '../portas/aplicador-de-tema';

/** Executado na inicialização, antes de a janela existir, para evitar troca de tema visível. */
export class AplicarTemaSalvo implements CasoDeUso<void, void> {
  constructor(
    private readonly repositorio: RepositorioPreferencias,
    private readonly aplicadorDeTema: AplicadorDeTema,
  ) {}

  async executar(): Promise<void> {
    this.aplicadorDeTema.aplicar((await this.repositorio.obterTema()) ?? TEMA_PADRAO);
  }
}
