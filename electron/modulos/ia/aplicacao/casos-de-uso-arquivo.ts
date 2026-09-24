import type {
  AnaliseArquivadaDTO,
  ResumoDeAnaliseDTO,
  UltimaAnaliseEntrada,
} from '@contratos/ia.contrato';
import type { CasoDeUso } from '../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaIa } from './erro-na-ia';
import type { RepositorioDeAnalises } from './portas';

const NAO_ENCONTRADA = 'Esta análise não está mais no arquivo (pode ter sido excluída).';

export class ListarAnalises implements CasoDeUso<void, ResumoDeAnaliseDTO[]> {
  constructor(private readonly arquivo: RepositorioDeAnalises) {}

  executar(): Promise<ResumoDeAnaliseDTO[]> {
    return this.arquivo.listar();
  }
}

export class ObterAnalise implements CasoDeUso<string, AnaliseArquivadaDTO> {
  constructor(private readonly arquivo: RepositorioDeAnalises) {}

  async executar(id: string): Promise<AnaliseArquivadaDTO> {
    const analise = await this.arquivo.obter(id);
    if (!analise) throw new ErroNaIa(NAO_ENCONTRADA);
    return analise;
  }
}

/** Abre o relatório já salvo, sem chamar a IA de novo. */
export class UltimaAnalise implements CasoDeUso<UltimaAnaliseEntrada, AnaliseArquivadaDTO | null> {
  constructor(private readonly arquivo: RepositorioDeAnalises) {}

  executar({ cronogramaId }: UltimaAnaliseEntrada): Promise<AnaliseArquivadaDTO | null> {
    return cronogramaId === null
      ? this.arquivo.ultima('portfolio', null)
      : this.arquivo.ultima('cronograma', cronogramaId);
  }
}

export class ExcluirAnalise implements CasoDeUso<string, null> {
  constructor(private readonly arquivo: RepositorioDeAnalises) {}

  async executar(id: string): Promise<null> {
    if (!(await this.arquivo.excluir(id))) throw new ErroNaIa(NAO_ENCONTRADA);
    return null;
  }
}
