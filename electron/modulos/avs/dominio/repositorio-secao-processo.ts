import type { Investimento } from './investimento';
import type { SecaoProcesso } from './secao-processo';

export interface DadosSecaoProcesso {
  secao: SecaoProcesso;
  investimentos: Investimento[];
}

export interface RepositorioSecaoProcesso {
  obter(avId: string): Promise<DadosSecaoProcesso | null>;
  /** Substitui a lista de investimentos inteira — mesmo padrão do Mapa de Custo. */
  salvar(dados: DadosSecaoProcesso): Promise<void>;
}
