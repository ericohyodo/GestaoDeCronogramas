import type { AtualizarEquipeEntrada, AvDetalheDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';
import { validarMembros } from '../validar-membros';

/** Só quem responde pela área Comercial (ou administrador) pode designar o time de uma AV. */
export class AtualizarEquipe implements CasoDeUso<AtualizarEquipeEntrada, AvDetalheDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly autorizacao: AutorizacaoAv,
    private readonly usuarios: ConsultaDeUsuarios,
  ) {}

  async executar(entrada: AtualizarEquipeEntrada): Promise<AvDetalheDTO> {
    const av = await this.repositorio.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    await this.autorizacao.exigirEdicaoDaArea(av, 'comercial');
    const ativos = await this.usuarios.listarAtivos();
    validarMembros(entrada.membros, ativos);

    av.atualizarEquipe(entrada.membros);
    await this.repositorio.salvar(av);

    return paraAvDetalheDTO(av, construirMapaDeNomes(ativos));
  }
}
