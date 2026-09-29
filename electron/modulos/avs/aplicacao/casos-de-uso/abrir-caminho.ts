import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import type { AbridorDeCaminho } from '../portas';

/** Abre um link de evidência (pasta de rede/local ou URL) — não é uma ação exclusiva de uma AV,
 * por isso não passa pela autorização por área: qualquer pessoa logada pode tentar abrir um
 * caminho que ela mesma está vendo na tela. */
export class AbrirCaminho implements CasoDeUso<string, null> {
  constructor(private readonly abridor: AbridorDeCaminho) {}

  async executar(caminho: string): Promise<null> {
    const falha = await this.abridor.abrir(caminho);
    if (falha) {
      throw new ErroDeDominio('FALHA_AO_ABRIR_CAMINHO', `Não foi possível abrir "${caminho}": ${falha}`);
    }
    return null;
  }
}
