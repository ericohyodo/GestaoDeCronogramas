import type { AvDetalheDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';

export class ObterAv implements CasoDeUso<string, AvDetalheDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly usuarios: ConsultaDeUsuarios,
  ) {}

  async executar(id: string): Promise<AvDetalheDTO> {
    const av = await this.repositorio.obterPorId(id);
    if (!av) throw new ErroNaoEncontrado('AV');
    const nomesPorId = construirMapaDeNomes(await this.usuarios.listarAtivos());
    return paraAvDetalheDTO(av, nomesPorId);
  }
}
