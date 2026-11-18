import type { AnexoAvDTO, NoEstruturaDTO, NoEstruturaEntrada } from './avs.contrato';

// =====================================================================================================
// AV de Item de Portfólio: cadastro de itens-modelo (templates) e checagens das áreas
// =====================================================================================================

/** Custos de referência por peça (R$), por categoria. */
export interface CustosPortfolioDTO {
  materiaPrima: number | null;
  insumos: number | null;
  embalagem: number | null;
  processo: number | null;
}

export interface ItemPortfolioResumoDTO extends CustosPortfolioDTO {
  id: string;
  codigo: string;
  descricao: string;
  cliente: string | null;
  linha: string | null;
  familia: string | null;
  programa: string | null;
  revisaoDesenho: string | null;
  /** AAAA-MM-DD da última atualização dos custos. */
  custosAtualizadosEm: string | null;
  ativo: boolean;
  atualizadoEm: string;
  atualizadoPor: string | null;
}

export interface OperacaoPortfolioDTO {
  id: string;
  descricao: string;
  maquina: string | null;
  pecasHora: number | null;
}

export interface ItemPortfolioDTO extends ItemPortfolioResumoDTO {
  observacoes: string | null;
  estrutura: NoEstruturaDTO[];
  operacoes: OperacaoPortfolioDTO[];
  /** Desenho de referência (mesmo formato dos anexos da AV; `secao` não se aplica). */
  anexos: AnexoAvDTO[];
}

export interface SalvarItemPortfolioEntrada {
  /** Ausente = item novo. */
  id?: string | null;
  codigo: string;
  descricao: string;
  cliente?: string | null;
  linha?: string | null;
  familia?: string | null;
  programa?: string | null;
  revisaoDesenho?: string | null;
  observacoes?: string | null;
  custos: CustosPortfolioDTO;
  custosAtualizadosEm?: string | null;
  estrutura: NoEstruturaEntrada[];
  operacoes: { descricao: string; maquina?: string | null; pecasHora?: number | null }[];
}

export const AREAS_DE_CHECAGEM = ['produto', 'processo', 'pcp', 'custo'] as const;
export type AreaChecagemDTO = (typeof AREAS_DE_CHECAGEM)[number];

/** Conclusão da área: confere, confere com ressalvas ou não confere. */
export const RESULTADOS_DE_CHECAGEM = ['confere', 'ressalvas', 'diverge'] as const;
export type ResultadoChecagemDTO = (typeof RESULTADOS_DE_CHECAGEM)[number];

export interface ChecagemPortfolioDTO {
  area: AreaChecagemDTO;
  resultado: ResultadoChecagemDTO;
  observacao: string | null;
  atualizadoEm: string;
  atualizadoPor: string | null;
}

export interface CustosDaAvPortfolioDTO {
  /** Foto dos custos do item no momento da checagem do Custo. */
  referencia: CustosPortfolioDTO & { atualizadosEm: string | null };
  /** Valores atualizados pelo Custo (vazios = mantém a referência). */
  novos: CustosPortfolioDTO;
  atualizadoEm: string;
}

/** Tudo o que as abas da AV de portfólio precisam: o item (template) e as conclusões das áreas. */
export interface PortfolioDaAvDTO {
  item: ItemPortfolioDTO | null;
  checagens: ChecagemPortfolioDTO[];
  custos: CustosDaAvPortfolioDTO | null;
}

export interface SalvarChecagemPortfolioEntrada {
  avId: string;
  area: AreaChecagemDTO;
  resultado: ResultadoChecagemDTO;
  observacao?: string | null;
  /** Só na área Custo: valores atualizados por peça (vazios = mantém a referência). */
  custosNovos?: CustosPortfolioDTO;
}
