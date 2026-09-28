import type { AnexoAvDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { Anexo } from '../../dominio/anexo';
import type { RepositorioAnexos } from '../../dominio/repositorio-anexos';
import { construirMapaDeNomes } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';

export function paraAnexoDTO(anexo: Anexo, nomes: Map<string, string>): AnexoAvDTO {
  return {
    id: anexo.id,
    secao: anexo.secao,
    nomeArquivo: anexo.nomeArquivo,
    tipoMime: anexo.tipoMime,
    tamanhoBytes: anexo.tamanhoBytes,
    criadoEm: anexo.criadoEm.toISOString(),
    criadoPor: anexo.usuarioId ? (nomes.get(anexo.usuarioId) ?? null) : null,
  };
}

export class ListarAnexos implements CasoDeUso<string, AnexoAvDTO[]> {
  constructor(
    private readonly repositorio: RepositorioAnexos,
    private readonly usuarios: ConsultaDeUsuarios,
  ) {}

  async executar(avId: string): Promise<AnexoAvDTO[]> {
    const [anexos, ativos] = await Promise.all([
      this.repositorio.listar(avId),
      this.usuarios.listarAtivos(),
    ]);
    const nomes = construirMapaDeNomes(ativos);
    return anexos.map((anexo) => paraAnexoDTO(anexo, nomes));
  }
}
