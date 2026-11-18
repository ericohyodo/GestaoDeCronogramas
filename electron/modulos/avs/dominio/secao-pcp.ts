import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';

export interface SecaoPcp {
  avId: string;
  observacoes: string | null;
  atualizadoEm: Date | null;
  atualizadoPor: string | null;
}

/** Carga de uma máquina numa operação: percentual de ocupação hoje e depois de implantar o item. */
export interface CargaMaquina {
  id: string;
  avId: string;
  ordem: number;
  operacao: string;
  maquina: string | null;
  pecasHora: number | null;
  cargaAtual: number | null;
  cargaFutura: number | null;
}

export interface CustoLogistico {
  id: string;
  avId: string;
  ordem: number;
  descricao: string;
  valor: number | null;
}

export interface DadosSecaoPcp {
  secao: SecaoPcp;
  cargas: CargaMaquina[];
  custos: CustoLogistico[];
}

export interface RepositorioSecaoPcp {
  obter(avId: string): Promise<DadosSecaoPcp | null>;
  /** Substitui a seção inteira (observações, cargas e custos), como nas demais seções. */
  salvar(dados: DadosSecaoPcp): Promise<void>;
}

export function validarOperacaoDaCarga(operacao: string): string {
  return exigirTexto(operacao, 'A operação da carga de máquina', 200);
}

export function validarDescricaoDoCusto(descricao: string): string {
  return exigirTexto(descricao, 'A descrição do custo logístico', 200);
}

export function normalizarMaquinaDaCarga(maquina: string | null | undefined): string | null {
  return normalizarTextoOpcional(maquina);
}

/** Percentuais não podem ser negativos; acima de 100 é permitido (a máquina ficaria sobrecarregada). */
export function validarPercentual(valor: number | null | undefined, campo: string): number | null {
  if (valor === null || valor === undefined) return null;
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErroDeValidacao(`${campo} deve ser um percentual igual ou maior que zero.`);
  }
  return valor;
}
