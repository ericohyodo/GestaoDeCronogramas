import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { SeletorDeArquivos } from '../portas';

/** Abre o seletor de arquivos do SO e devolve o caminho escolhido (ou `null` se cancelou), para
 * preencher um link de evidência. Não copia nem anexa nada: só ajuda a digitar o caminho. */
export class SelecionarCaminho implements CasoDeUso<void, string | null> {
  constructor(private readonly seletor: SeletorDeArquivos) {}

  async executar(): Promise<string | null> {
    const arquivos = await this.seletor.escolher({ modo: 'qualquer-arquivo' });
    return arquivos?.[0]?.caminhoOriginal ?? null;
  }
}
