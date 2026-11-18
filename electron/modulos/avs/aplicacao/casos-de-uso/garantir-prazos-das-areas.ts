import { diaLocal, somarDiasUteis } from '../../../../nucleo/dominio/calendario';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { RepositorioHistoricoAv } from '../../dominio/historico-av';
import {
  AREA_DA_ETAPA_COM_PRAZO,
  type RepositorioConfigPrazos,
  type RepositorioPrazosArea,
} from '../../dominio/prazo-area';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';

/**
 * Rotina: dá prazo às AVs que já estavam numa etapa com área (2 a 5) antes de os prazos existirem (versão
 * 0.4.0). O início é a chegada à etapa atual segundo o histórico (ignorando as linhas de "renumeração", em
 * que a etapa de origem e a de destino são iguais) ou, sem histórico, a criação da AV. Idempotente.
 */
export class GarantirPrazosDasAreas {
  /**
   * @param avs repositório das AVs
   * @param historico histórico de etapas (somente leitura)
   * @param prazos onde os prazos são gravados
   * @param config dias úteis de cada área
   * @param ids gerador de id
   */
  constructor(
    private readonly avs: RepositorioAvs,
    private readonly historico: RepositorioHistoricoAv,
    private readonly prazos: RepositorioPrazosArea,
    private readonly config: RepositorioConfigPrazos,
    private readonly ids: GeradorDeId,
  ) {}

  /** @returns quantos prazos foram criados */
  async executar(): Promise<number> {
    const config = await this.config.obter();
    let criados = 0;
    for (const av of await this.avs.listar()) {
      const area = AREA_DA_ETAPA_COM_PRAZO[av.etapaAtual];
      if (av.historico || !area || (await this.prazos.obterAberto(av.id, av.etapaAtual))) continue;
      const chegada = (await this.historico.listarPorAv(av.id))
        .filter((item) => item.etapaPara === av.etapaAtual && item.etapaDe !== item.etapaPara)
        .reduce<Date | null>((maisRecente, item) => (!maisRecente || item.data > maisRecente ? item.data : maisRecente), null);
      const iniciadaEm = chegada ?? av.criadoEm;
      await this.prazos.abrir({
        id: this.ids.gerar(),
        avId: av.id,
        etapa: av.etapaAtual,
        area,
        diasUteis: config[area],
        iniciadaEm,
        dataLimite: somarDiasUteis(diaLocal(iniciadaEm), config[area]),
        entregueEm: null,
      });
      criados += 1;
    }
    return criados;
  }
}
