import type { HistoricoAvItemDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { obterEtapaAv } from '../../dominio/etapa-av';
import type { RepositorioHistoricoAv } from '../../dominio/historico-av';
import { construirMapaDeNomes } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';

export class ListarHistoricoAv implements CasoDeUso<string, HistoricoAvItemDTO[]> {
  constructor(
    private readonly historico: RepositorioHistoricoAv,
    private readonly usuarios: ConsultaDeUsuarios,
  ) {}

  async executar(avId: string): Promise<HistoricoAvItemDTO[]> {
    const [itens, ativos] = await Promise.all([
      this.historico.listarPorAv(avId),
      this.usuarios.listarAtivos(),
    ]);
    const nomes = construirMapaDeNomes(ativos);
    return itens.map((item) => ({
      id: item.id,
      etapaDe: item.etapaDe !== null ? obterEtapaAv(item.etapaDe) : null,
      etapaPara: obterEtapaAv(item.etapaPara),
      usuarioNome: item.usuarioId ? (nomes.get(item.usuarioId) ?? null) : null,
      comentario: item.comentario,
      data: item.data.toISOString(),
    }));
  }
}
