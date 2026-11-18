import type { ItemCustoMaterial, ItemCustoProcesso, SecaoCusto } from './secao-custo';

export interface DadosSecaoCusto {
  secao: SecaoCusto;
  materiais: ItemCustoMaterial[];
  processo: ItemCustoProcesso[];
}

export interface RepositorioSecaoCusto {
  obter(avId: string): Promise<DadosSecaoCusto | null>;
  /** Substitui as listas de materiais e de processo inteiras — mais simples que diffar linha a linha. */
  salvar(dados: DadosSecaoCusto): Promise<void>;
}

export interface ItemCatalogoMaterial {
  codigo: string;
  descricao: string;
}

export interface RepositorioCatalogoCusto {
  listarOperacoes(): Promise<string[]>;
  listarMaquinas(): Promise<string[]>;
  listarMateriais(tipo: 'materia_prima' | 'embalagem'): Promise<ItemCatalogoMaterial[]>;
}
