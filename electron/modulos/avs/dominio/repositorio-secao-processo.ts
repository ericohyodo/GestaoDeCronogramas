import type { Investimento } from './investimento';
import type { Operacao } from './operacao';
import type { SecaoProcesso } from './secao-processo';

export interface DadosSecaoProcesso {
  secao: SecaoProcesso;
  operacoes: Operacao[];
  investimentos: Investimento[];
}

export interface RepositorioSecaoProcesso {
  obter(avId: string): Promise<DadosSecaoProcesso | null>;
  /** Substitui as listas de operações e de investimentos inteiras — mesmo padrão do Mapa de Custo. */
  salvar(dados: DadosSecaoProcesso): Promise<void>;
}
