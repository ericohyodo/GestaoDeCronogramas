import type { DashboardAvDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ETAPAS_AV, obterEtapaAv } from '../../dominio/etapa-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';

const ETAPAS_DE_DECLINIO = new Set(['declinada_cliente', 'declinada_empresa']);

export class ObterDashboard implements CasoDeUso<void, DashboardAvDTO> {
  constructor(private readonly repositorio: RepositorioAvs) {}

  async executar(): Promise<DashboardAvDTO> {
    const avs = await this.repositorio.listar();
    const contagemPorEtapa = new Map<number, number>();
    let concluidas = 0;
    let declinadas = 0;

    for (const av of avs) {
      contagemPorEtapa.set(av.etapaAtual, (contagemPorEtapa.get(av.etapaAtual) ?? 0) + 1);
      const etapa = obterEtapaAv(av.etapaAtual);
      if (etapa.chave === 'projeto_criado') concluidas += 1;
      else if (ETAPAS_DE_DECLINIO.has(etapa.chave)) declinadas += 1;
    }

    return {
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
