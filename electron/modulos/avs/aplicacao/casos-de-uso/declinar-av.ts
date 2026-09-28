import type { AvDetalheDTO, DeclinarAvEntrada } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroDeDominio, ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { obterEtapaAv, obterEtapaPorChave } from '../../dominio/etapa-av';
import type { RepositorioHistoricoAv } from '../../dominio/historico-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';

/** Declinar é sempre uma decisão comercial: só o dono dessa área (ou administrador) pode encerrar a AV assim. */
export class DeclinarAv implements CasoDeUso<DeclinarAvEntrada, AvDetalheDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly historico: RepositorioHistoricoAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
    private readonly usuarios: ConsultaDeUsuarios,
  ) {}

  async executar(entrada: DeclinarAvEntrada): Promise<AvDetalheDTO> {
    if (!entrada.motivo.trim()) throw new ErroDeValidacao('Informe o motivo da recusa.');

    const av = await this.repositorio.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    const etapaAtual = obterEtapaAv(av.etapaAtual);
    if (etapaAtual.terminal) {
      throw new ErroDeDominio('AV_JA_FINALIZADA', 'Esta AV já está em uma etapa final.');
    }

    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, 'comercial');
    const destino = obterEtapaPorChave(entrada.etapa);
    const agora = this.relogio.agora();

    av.moverParaEtapa(destino.numero);
    await this.repositorio.salvar(av);

    const comentario = [entrada.motivo.trim(), entrada.comentario?.trim()].filter(Boolean).join(' — ');
    await this.historico.registrar({
      id: this.geradorDeId.gerar(),
      avId: av.id,
      etapaDe: etapaAtual.numero,
      etapaPara: destino.numero,
      usuarioId: usuario.id,
      comentario,
      data: agora,
    });

    return paraAvDetalheDTO(av, construirMapaDeNomes(await this.usuarios.listarAtivos()));
  }
}
