import type { SdDTO } from '@contratos/sds.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import { obterEtapaPorChave } from '../../dominio/etapa-av';
import type { RepositorioHistoricoAv } from '../../dominio/historico-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import type { CriadorDePreSd } from '../portas';

/**
 * Encerra a análise: cria a Pré-SD com o mesmo número da AV e move a AV para "SD Aberta".
 * Só vale depois que Comercial, Produto, Processo e PCP foram liberados (AV já no Mapa de Custo
 * ou adiante) e é decisão do Comercial, como o envio da proposta.
 */
export class FinalizarECriarPreSd implements CasoDeUso<string, SdDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly historico: RepositorioHistoricoAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly criador: CriadorDePreSd,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(avId: string): Promise<SdDTO> {
    const av = await this.repositorio.obterPorId(avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, 'comercial');
    const mapaDeCusto = obterEtapaPorChave('mapa_custo');
    const sdAberta = obterEtapaPorChave('sd_aberta');
    if (av.etapaAtual < mapaDeCusto.numero || av.etapaAtual > sdAberta.numero) {
      throw new ErroDeDominio(
        'AV_FORA_DA_ETAPA_DE_SD',
        'Libere Comercial, Eng. Produto, Eng. Processo e PCP antes de finalizar a AV.',
      );
    }

    const sd = await this.criador.criar({ avId: av.id, avNumero: av.numero, usuarioId: usuario.id });

    const agora = this.relogio.agora();
    const etapaDe = av.etapaAtual;
    av.moverParaEtapa(sdAberta.numero);
    if (!av.propostaEnviada) av.marcarPropostaEnviada(agora);
    await this.repositorio.salvar(av);
    await this.historico.registrar({
      id: this.geradorDeId.gerar(),
      avId: av.id,
      etapaDe,
      etapaPara: sdAberta.numero,
      usuarioId: usuario.id,
      comentario: `AV finalizada; Pré-SD ${sd.numero} criada.`,
      data: agora,
    });
    return sd;
  }
}
