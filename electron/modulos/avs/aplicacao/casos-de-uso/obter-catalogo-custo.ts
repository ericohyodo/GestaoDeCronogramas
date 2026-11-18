import type { CatalogoCustoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioCatalogoCusto } from '../../dominio/repositorio-secao-custo';

export class ObterCatalogoCusto implements CasoDeUso<void, CatalogoCustoDTO> {
  constructor(private readonly repositorio: RepositorioCatalogoCusto) {}

  async executar(): Promise<CatalogoCustoDTO> {
    const [operacoes, maquinas, materiaPrima, embalagem] = await Promise.all([
      this.repositorio.listarOperacoes(),
      this.repositorio.listarMaquinas(),
      this.repositorio.listarMateriais('materia_prima'),
      this.repositorio.listarMateriais('embalagem'),
    ]);
    return { operacoes, maquinas, materiaPrima, embalagem };
  }
}
