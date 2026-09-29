import type { ConteudoAnexoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioAnexos } from '../../dominio/repositorio-anexos';
import type { ArmazenamentoDeArquivos } from '../portas';

export class ObterConteudoAnexo implements CasoDeUso<string, ConteudoAnexoDTO> {
  constructor(
    private readonly repositorio: RepositorioAnexos,
    private readonly armazenamento: ArmazenamentoDeArquivos,
  ) {}

  async executar(anexoId: string): Promise<ConteudoAnexoDTO> {
    const anexo = await this.repositorio.obterPorId(anexoId);
    if (!anexo) throw new ErroNaoEncontrado('Anexo');

    const base64 = await this.armazenamento.lerConteudoBase64(anexo.avId, anexo.nomeArmazenado);
    return { nomeArquivo: anexo.nomeArquivo, tipoMime: anexo.tipoMime, base64 };
  }
}
