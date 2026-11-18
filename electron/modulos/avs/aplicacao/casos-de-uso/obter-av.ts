import type { AvDetalheDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { chaveDaSecao } from '../versoes';

export class ObterAv implements CasoDeUso<string, AvDetalheDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly versoes: ControleDeVersao = versaoSemControle,
  ) {}

  async executar(id: string): Promise<AvDetalheDTO> {
    const av = await this.repositorio.obterPorId(id);
    if (!av) throw new ErroNaoEncontrado('AV');
    const nomesPorId = construirMapaDeNomes(await this.usuarios.listarAtivos());
    return paraAvDetalheDTO(av, nomesPorId, this.versoes.obter(chaveDaSecao(av.id, 'comercial')));
  }
}
