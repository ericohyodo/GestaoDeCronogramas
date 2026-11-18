import type { DashboardAvDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ETAPAS_AV, obterEtapaAv } from '../../dominio/etapa-av';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { diaLocal } from '../../../../nucleo/dominio/calendario';
import { type RepositorioPrazosArea, situacaoDoPrazo } from '../../dominio/prazo-area';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';

const ETAPAS_DE_DECLINIO = new Set(['declinada_cliente', 'declinada_empresa']);

export class ObterDashboard implements CasoDeUso<void, DashboardAvDTO> {
  /**
   * @param repositorio AVs
   * @param prazos prazos das áreas (faixa "Prazos das áreas")
   * @param relogio data de referência
   */
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly prazos: RepositorioPrazosArea,
    private readonly relogio: Relogio,
  ) {}

  /** @returns contadores das AVs (fora do histórico), por etapa e pela situação do prazo da área atual */
  async executar(): Promise<DashboardAvDTO> {
    // O histórico (antes do uso multiusuário) fica fora dos contadores.
    // A AV de portfólio tem lista própria: fora do painel das AVs.
    const avs = (await this.repositorio.listar()).filter((av) => !av.historico && !av.ehPortfolio);
    const contagemPorEtapa = new Map<number, number>();
    let concluidas = 0;
    let declinadas = 0;

    for (const av of avs) {
      contagemPorEtapa.set(av.etapaAtual, (contagemPorEtapa.get(av.etapaAtual) ?? 0) + 1);
      const etapa = obterEtapaAv(av.etapaAtual);
      if (etapa.chave === 'projeto_criado') concluidas += 1;
      else if (ETAPAS_DE_DECLINIO.has(etapa.chave)) declinadas += 1;
    }

    // AV em andamento → etapa atual; só conta o prazo da etapa em que a AV está.
    const etapaAtual = new Map(
      avs.filter((av) => !obterEtapaAv(av.etapaAtual).terminal).map((av) => [av.id, av.etapaAtual]),
    );
    const hoje = diaLocal(this.relogio.agora());
    const prazosDasAreas = { noPrazo: [] as string[], vencendo: [] as string[], atrasadas: [] as string[] };
    for (const prazo of await this.prazos.listarAbertos()) {
      if (etapaAtual.get(prazo.avId) !== prazo.etapa) continue;
      const situacao = situacaoDoPrazo(prazo, hoje);
      if (situacao === 'no_prazo') prazosDasAreas.noPrazo.push(prazo.avId);
      else if (situacao === 'vencendo') prazosDasAreas.vencendo.push(prazo.avId);
      else if (situacao === 'atrasada') prazosDasAreas.atrasadas.push(prazo.avId);
    }

    return {
      prazosDasAreas,
      total: avs.length,
      emAndamento: avs.length - concluidas - declinadas,
      concluidas,
      declinadas,
      porEtapa: ETAPAS_AV.map((etapa) => ({
        etapa,
        quantidade: contagemPorEtapa.get(etapa.numero) ?? 0,
      })),
    };
  }
}
