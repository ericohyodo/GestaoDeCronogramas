import type { AtualizarComercialEntrada, AvDetalheDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';

export class AtualizarComercial implements CasoDeUso<AtualizarComercialEntrada, AvDetalheDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly autorizacao: AutorizacaoAv,
    private readonly usuarios: ConsultaDeUsuarios,
  ) {}

  async executar(entrada: AtualizarComercialEntrada): Promise<AvDetalheDTO> {
    const { avId, ...campos } = entrada;
    const av = await this.repositorio.obterPorId(avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    await this.autorizacao.exigirEdicaoDaArea(av, 'comercial');
    av.atualizarComercial(campos);
    await this.repositorio.salvar(av);

    const nomesPorId = construirMapaDeNomes(await this.usuarios.listarAtivos());
    return paraAvDetalheDTO(av, nomesPorId);
  }
}
