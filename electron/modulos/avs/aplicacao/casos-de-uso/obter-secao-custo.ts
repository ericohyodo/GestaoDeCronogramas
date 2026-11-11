import type { SecaoCustoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioSecaoCusto } from '../../dominio/repositorio-secao-custo';
import { paraSecaoCustoDTO } from '../mapeador-custo-dto';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { chaveDaSecao } from '../versoes';

export class ObterSecaoCusto implements CasoDeUso<string, SecaoCustoDTO> {
  constructor(
    private readonly repositorio: RepositorioSecaoCusto,
    private readonly versoes: ControleDeVersao = versaoSemControle,
  ) {}

  async executar(avId: string): Promise<SecaoCustoDTO> {
    return paraSecaoCustoDTO(await this.repositorio.obter(avId), this.versoes.obter(chaveDaSecao(avId, 'custo')));
  }
}
