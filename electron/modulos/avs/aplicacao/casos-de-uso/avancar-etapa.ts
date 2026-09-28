import type { AvancarEtapaEntrada, AvDetalheDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { obterEtapaAv } from '../../dominio/etapa-av';
import type { RepositorioHistoricoAv } from '../../dominio/historico-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';

/**
 * Avança a AV exatamente uma etapa, na ordem do catálogo — não existe "liberar fora de ordem"
 * como no app antigo. Só quem responde pela área da etapa atual (ou administrador) pode chamar.
 */
export class AvancarEtapa implements CasoDeUso<AvancarEtapaEntrada, AvDetalheDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly historico: RepositorioHistoricoAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
    private readonly usuarios: ConsultaDeUsuarios,
  ) {}

  async executar(entrada: AvancarEtapaEntrada): Promise<AvDetalheDTO> {
    const av = await this.repositorio.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    const etapaAtual = obterEtapaAv(av.etapaAtual);
    if (etapaAtual.terminal) {
      throw new ErroDeDominio('AV_JA_FINALIZADA', 'Esta AV já está em uma etapa final.');
    }
    if (etapaAtual.chave === 'sd_aberta') {
      throw new ErroDeDominio(
        'SD_NAO_IMPLEMENTADA',
        'A etapa de abertura de SD ainda não está disponível nesta versão.',
      );
    }
    if (!etapaAtual.area) {
      throw new ErroDeDominio('ETAPA_SEM_AREA', 'Esta etapa não tem uma área responsável definida.');
    }

    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, etapaAtual.area);
    const proxima = obterEtapaAv(etapaAtual.numero + 1);
    const agora = this.relogio.agora();

    av.moverParaEtapa(proxima.numero);
    if (proxima.chave === 'proposta_enviada') av.marcarPropostaEnviada(agora);
    await this.repositorio.salvar(av);

    await this.historico.registrar({
      id: this.geradorDeId.gerar(),
      avId: av.id,
      etapaDe: etapaAtual.numero,
      etapaPara: proxima.numero,
      usuarioId: usuario.id,
      comentario: entrada.comentario ?? null,
      data: agora,
    });

    return paraAvDetalheDTO(av, construirMapaDeNomes(await this.usuarios.listarAtivos()));
  }
}
