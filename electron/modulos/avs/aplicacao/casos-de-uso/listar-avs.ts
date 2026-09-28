import type { AvResumoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import { construirMapaDeNomes, paraAvResumoDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';

export class ListarAvs implements CasoDeUso<void, AvResumoDTO[]> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly usuarios: ConsultaDeUsuarios,
  ) {}

  async executar(): Promise<AvResumoDTO[]> {
    const [avs, ativos] = await Promise.all([this.repositorio.listar(), this.usuarios.listarAtivos()]);
    const nomesPorId = construirMapaDeNomes(ativos);
    return avs.map((av) => paraAvResumoDTO(av, nomesPorId));
  }
}
