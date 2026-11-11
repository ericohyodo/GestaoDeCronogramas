import type { SecaoProdutoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioSecaoProduto } from '../../dominio/repositorio-secao-produto';
import { paraSecaoProdutoDTO } from '../mapeador-produto-processo-dto';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { chaveDaSecao } from '../versoes';

export class ObterSecaoProduto implements CasoDeUso<string, SecaoProdutoDTO> {
  constructor(
    private readonly repositorio: RepositorioSecaoProduto,
    private readonly versoes: ControleDeVersao = versaoSemControle,
  ) {}

  async executar(avId: string): Promise<SecaoProdutoDTO> {
    return paraSecaoProdutoDTO(await this.repositorio.obter(avId), this.versoes.obter(chaveDaSecao(avId, 'produto')));
  }
}
