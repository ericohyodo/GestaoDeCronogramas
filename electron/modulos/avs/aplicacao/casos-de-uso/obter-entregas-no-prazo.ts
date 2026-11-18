import type { EntregasPorAreaDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { diaLocal, diasUteisEntre } from '../../../../nucleo/dominio/calendario';
import { AREAS_COM_PRAZO, type RepositorioPrazosArea, situacaoDoPrazo } from '../../dominio/prazo-area';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import { ROTULO_DA_AREA } from '../notificacoes-av';

/** Janela do indicador de entregas no prazo. */
export const DIAS_DA_JANELA_DE_ENTREGAS = 90;

/**
 * Indicador de pontualidade por área: das etapas entregues nos últimos 90 dias, quantas ficaram dentro do
 * prazo e quantos dias úteis levaram em média. AVs do histórico ficam fora.
 */
export class ObterEntregasNoPrazo implements CasoDeUso<void, EntregasPorAreaDTO[]> {
  /**
   * @param prazos prazos das áreas
   * @param avs repositório das AVs (para excluir o histórico)
   * @param relogio data de referência
   */
  constructor(
    private readonly prazos: RepositorioPrazosArea,
    private readonly avs: RepositorioAvs,
    private readonly relogio: Relogio,
  ) {}

  /** @returns uma linha por área, na ordem Produto, Processo, PCP, Custo */
  async executar(): Promise<EntregasPorAreaDTO[]> {
    const agora = this.relogio.agora();
    const desde = new Date(agora.getTime() - DIAS_DA_JANELA_DE_ENTREGAS * 86_400_000).toISOString();
    const historico = new Set((await this.avs.listar()).filter((av) => av.historico).map((av) => av.id));
    const entregues = (await this.prazos.listarEntreguesDesde(desde)).filter((prazo) => !historico.has(prazo.avId));
    const hoje = diaLocal(agora);

    return AREAS_COM_PRAZO.map((area) => {
      const daArea = entregues.filter((prazo) => prazo.area === area);
      const noPrazo = daArea.filter((prazo) => situacaoDoPrazo(prazo, hoje) === 'entregue_no_prazo').length;
      const somaDias = daArea.reduce(
        (total, prazo) => total + diasUteisEntre(diaLocal(prazo.iniciadaEm), diaLocal(prazo.entregueEm!)),
        0,
      );
      return {
        area: ROTULO_DA_AREA[area],
        entregues: daArea.length,
        noPrazo,
        percentualNoPrazo: daArea.length ? Math.round((noPrazo / daArea.length) * 100) : 0,
        mediaDiasUteis: daArea.length ? Math.round((somaDias / daArea.length) * 10) / 10 : 0,
      };
    });
  }
}
