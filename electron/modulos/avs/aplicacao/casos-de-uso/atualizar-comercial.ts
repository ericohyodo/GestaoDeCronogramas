import type { AtualizarComercialEntrada, AvDetalheDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { chaveDaSecao } from '../versoes';

export class AtualizarComercial implements CasoDeUso<AtualizarComercialEntrada, AvDetalheDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly autorizacao: AutorizacaoAv,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly versoes: ControleDeVersao = versaoSemControle,
  ) {}

  async executar(entrada: AtualizarComercialEntrada): Promise<AvDetalheDTO> {
    const { avId, versaoEsperada, ...campos } = entrada;
    const av = await this.repositorio.obterPorId(avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    await this.autorizacao.exigirEdicaoDaArea(av, 'comercial');
    av.atualizarComercial(campos);
    this.versoes.confirmar(chaveDaSecao(av.id, 'comercial'), versaoEsperada);
    await this.repositorio.salvar(av);

    const nomesPorId = construirMapaDeNomes(await this.usuarios.listarAtivos());
    return paraAvDetalheDTO(av, nomesPorId, this.versoes.obter(chaveDaSecao(av.id, 'comercial')));
  }
}
