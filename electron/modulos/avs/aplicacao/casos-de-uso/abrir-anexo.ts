import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioAnexos } from '../../dominio/repositorio-anexos';
import type { ArmazenamentoDeArquivos } from '../portas';

/**
 * Abre um anexo da AV no programa padrão do Windows. Serve para os formatos que o app não pré-visualiza
 * (TIFF). Só abre arquivos já registrados no banco: o caminho nunca vem da tela.
 */
export class AbrirAnexo implements CasoDeUso<string, null> {
  constructor(
    private readonly repositorio: RepositorioAnexos,
    private readonly armazenamento: ArmazenamentoDeArquivos,
  ) {}

  /**
   * @param anexoId id do anexo
   * @returns `null` quando abriu
   * @throws ErroNaoEncontrado se o anexo não existir
   */
  async executar(anexoId: string): Promise<null> {
    const anexo = await this.repositorio.obterPorId(anexoId);
    if (!anexo) throw new ErroNaoEncontrado('Anexo');
    await this.armazenamento.abrirNoProgramaPadrao(anexo.avId, anexo.nomeArmazenado);
    return null;
  }
}
