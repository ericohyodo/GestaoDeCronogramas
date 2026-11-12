import { diaLocal, somarDiasUteis } from '../../../../nucleo/dominio/calendario';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { ItemHistoricoAv, RepositorioHistoricoAv } from '../../dominio/historico-av';
import {
  AREA_DA_ETAPA_COM_PRAZO,
  type RepositorioConfigPrazos,
  type RepositorioPrazosArea,
} from '../../dominio/prazo-area';

/**
 * Histórico de etapas que também controla os prazos das áreas. Toda mudança de etapa da AV passa pelo
 * histórico (avançar, finalizar, declinar, concluir com projeto), então é aqui que o prazo da etapa que sai
 * é entregue e o da etapa que chega é aberto — nenhum caminho fica de fora. Roda na mesma transação do caso
 * de uso que registrou a mudança.
 */
export class HistoricoComPrazos implements RepositorioHistoricoAv {
  /**
   * @param interno repositório real do histórico
   * @param prazos onde os prazos das áreas são gravados
   * @param config dias úteis de cada área
   * @param ids gerador de id dos prazos
   */
  constructor(
    private readonly interno: RepositorioHistoricoAv,
    private readonly prazos: RepositorioPrazosArea,
    private readonly config: RepositorioConfigPrazos,
    private readonly ids: GeradorDeId,
  ) {}

  /** Registra a mudança e atualiza os prazos: entrega o da etapa de origem e abre o da etapa de destino. */
  async registrar(item: ItemHistoricoAv): Promise<void> {
    await this.interno.registrar(item);
    if (item.etapaDe === item.etapaPara) return;
    if (item.etapaDe !== null && AREA_DA_ETAPA_COM_PRAZO[item.etapaDe]) {
      await this.prazos.entregar(item.avId, item.etapaDe, item.data);
    }
    const area = AREA_DA_ETAPA_COM_PRAZO[item.etapaPara];
    if (!area) return;
    const diasUteis = (await this.config.obter())[area];
    await this.prazos.abrir({
      id: this.ids.gerar(),
      avId: item.avId,
      etapa: item.etapaPara,
      area,
      diasUteis,
      iniciadaEm: item.data,
      dataLimite: somarDiasUteis(diaLocal(item.data), diasUteis),
      entregueEm: null,
    });
  }

  /** Só repassa ao histórico real. */
  listarPorAv(avId: string): Promise<ItemHistoricoAv[]> {
    return this.interno.listarPorAv(avId);
  }
}
