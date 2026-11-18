import type { NoEstrutura } from './estrutura-produto';
import type { Investimento } from './investimento';
import type { SecaoProduto } from './secao-produto';

export interface DadosSecaoProduto {
  secao: SecaoProduto;
  estrutura: NoEstrutura[];
  investimentos: Investimento[];
}

export interface RepositorioSecaoProduto {
  obter(avId: string): Promise<DadosSecaoProduto | null>;
  /** Substitui a lista de investimentos inteira — mesmo padrão do Mapa de Custo. */
  salvar(dados: DadosSecaoProduto): Promise<void>;
}
