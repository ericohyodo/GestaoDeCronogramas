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

/**
 * Carga de uma máquina numa operação, na unidade da operação (ex.: placas na fundição): o que ela produz hoje
 * por mês e quantas peças do produto final saem de cada unidade (conversão). A carga futura não é gravada:
 * sai do volume anual da AV ÷ 12 ÷ conversão.
 */
export interface CargaMaquina {
  id: string;
  avId: string;
  ordem: number;
  operacao: string;
  maquina: string | null;
  /** Unidades da operação por hora. */
  pecasHora: number | null;
  /** Peças do produto final por unidade da operação (1 = mesma unidade). */
  conversao: number;
  /** Carga atual da máquina, em unidades da operação por mês. */
  cargaAtualPecas: number | null;
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

/**
 * Quantidades da carga (peças/hora, carga atual) não podem ser negativas.
 * @param valor número informado ou vazio
 * @param campo nome do campo para a mensagem
 * @returns o valor, ou `null` quando vazio
 * @throws ErroDeValidacao se negativo ou inválido
 */
export function validarQuantidadeDaCarga(valor: number | null | undefined, campo: string): number | null {
  if (valor === null || valor === undefined) return null;
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErroDeValidacao(`${campo} deve ser um número igual ou maior que zero.`);
  }
  return valor;
}

/**
 * Conversão: peças do produto final por unidade da operação. Vazia vale 1.
 * @param valor número informado ou vazio
 * @returns a conversão (> 0)
 * @throws ErroDeValidacao se zero, negativa ou inválida
 */
export function validarConversao(valor: number | null | undefined): number {
  if (valor === null || valor === undefined) return 1;
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new ErroDeValidacao('A conversão deve ser maior que zero (peças do produto por unidade da operação).');
  }
  return valor;
}
