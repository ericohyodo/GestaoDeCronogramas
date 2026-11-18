import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';

export interface SecaoPcp {
  avId: string;
  observacoes: string | null;
  /** "Sem alterações significativas" declarado em cada bloco opcional. */
  layoutSemAlteracoes: boolean;
  custosSemAlteracoes: boolean;
  observacoesSemAlteracoes: boolean;
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

/**
 * A declaração "Sem alterações significativas" substitui o conteúdo do bloco: não pode vir junto com ele.
 * @param declaracoes flags enviadas pela tela
 * @param conteudo o que foi preenchido nos blocos de custos e observações
 * @throws ErroDeValidacao quando o bloco tem conteúdo e a declaração ao mesmo tempo
 */
export function validarDeclaracoesPcp(
  declaracoes: { custosSemAlteracoes: boolean; observacoesSemAlteracoes: boolean },
  conteudo: { quantidadeDeCustos: number; observacoes: string | null },
): void {
  if (declaracoes.custosSemAlteracoes && conteudo.quantidadeDeCustos > 0) {
    throw new ErroDeValidacao(
      'Custos logísticos: remova os custos lançados ou desmarque "Sem alterações significativas".',
    );
  }
  if (declaracoes.observacoesSemAlteracoes && conteudo.observacoes) {
    throw new ErroDeValidacao('Observações: apague o texto ou desmarque "Sem alterações significativas".');
  }
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
