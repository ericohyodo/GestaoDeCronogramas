import type { SecaoProdutoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioSecaoProduto } from '../../dominio/repositorio-secao-produto';
import { paraSecaoProdutoDTO } from '../mapeador-produto-processo-dto';

export class ObterSecaoProduto implements CasoDeUso<string, SecaoProdutoDTO> {
  constructor(private readonly repositorio: RepositorioSecaoProduto) {}

  async executar(avId: string): Promise<SecaoProdutoDTO> {
    return paraSecaoProdutoDTO(await this.repositorio.obter(avId));
  }
}
