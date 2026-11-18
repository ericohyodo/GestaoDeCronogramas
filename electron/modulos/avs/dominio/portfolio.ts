import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';
import type { NoEstrutura } from './estrutura-produto';

// =====================================================================================================
// Itens de portfólio (templates) e as checagens da AV de Item de Portfólio
// =====================================================================================================

/** Custos de referência por peça (R$), por categoria. */
export interface CustosDeReferencia {
  materiaPrima: number | null;
  insumos: number | null;
  embalagem: number | null;
  processo: number | null;
}

export interface ItemPortfolio extends CustosDeReferencia {
  id: string;
  codigo: string;
  descricao: string;
  cliente: string | null;
  linha: string | null;
  familia: string | null;
  programa: string | null;
  revisaoDesenho: string | null;
  /** Data (AAAA-MM-DD) da última atualização dos custos de referência. */
  custosAtualizadosEm: string | null;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: Date;
  criadoPor: string | null;
  atualizadoEm: Date;
  atualizadoPor: string | null;
}

/** Operação do item com a máquina e a capacidade (pçs/hora). */
export interface OperacaoPortfolio {
  id: string;
  itemId: string;
  ordem: number;
  descricao: string;
  maquina: string | null;
  pecasHora: number | null;
}

/** Item da estrutura do produto do template (mesmo formato da estrutura da AV, ligado ao item). */
export type NoEstruturaPortfolio = Omit<NoEstrutura, 'avId'> & { itemId: string };

export interface AnexoPortfolio {
  id: string;
  itemId: string;
  nomeArquivo: string;
  nomeArmazenado: string;
  tipoMime: string | null;
  tamanhoBytes: number;
  usuarioId: string | null;
  criadoEm: Date;
}

export interface ItemPortfolioCompleto {
  item: ItemPortfolio;
  estrutura: NoEstruturaPortfolio[];
  operacoes: OperacaoPortfolio[];
}

export interface RepositorioPortfolio {
  /** Itens ordenados por código; `apenasAtivos` para a escolha na abertura da AV. */
  listar(apenasAtivos: boolean): Promise<ItemPortfolio[]>;
  obter(id: string): Promise<ItemPortfolioCompleto | null>;
  /** Existe outro item (id diferente) com o mesmo código? */
  codigoEmUso(codigo: string, excetoId: string | null): Promise<boolean>;
  /** Grava o item e substitui estrutura e operações numa transação. */
  salvar(dados: ItemPortfolioCompleto): Promise<void>;
  listarAnexos(itemId: string): Promise<AnexoPortfolio[]>;
  obterAnexo(id: string): Promise<AnexoPortfolio | null>;
  inserirAnexo(anexo: AnexoPortfolio): Promise<void>;
  excluirAnexo(id: string): Promise<void>;
}

const LIMITE_OPERACOES = 100;

/**
 * Normaliza e valida os campos de texto do item.
 * @throws ErroDeValidacao sem código ou descrição
 */
export function validarIdentificacaoDoItem(dados: {
  codigo: string;
  descricao: string;
  cliente?: string | null;
  linha?: string | null;
  familia?: string | null;
  programa?: string | null;
  revisaoDesenho?: string | null;
  observacoes?: string | null;
}) {
  const observacoes = normalizarTextoOpcional(dados.observacoes);
  if (observacoes && observacoes.length > 2000) {
    throw new ErroDeValidacao('As observações do item podem ter no máximo 2000 caracteres.');
  }
  return {
    codigo: exigirTexto(dados.codigo, 'O código do item', 60),
    descricao: exigirTexto(dados.descricao, 'A descrição do item', 200),
    cliente: normalizarTextoOpcional(dados.cliente),
    linha: normalizarTextoOpcional(dados.linha),
    familia: normalizarTextoOpcional(dados.familia),
    programa: normalizarTextoOpcional(dados.programa),
    revisaoDesenho: normalizarTextoOpcional(dados.revisaoDesenho),
    observacoes,
  };
}

/**
 * Custo por peça de uma categoria: vazio ou número ≥ 0.
 * @param valor número informado
 * @param campo nome do campo para a mensagem
 * @throws ErroDeValidacao se negativo
 */
export function validarCusto(valor: number | null | undefined, campo: string): number | null {
  if (valor === null || valor === undefined) return null;
  if (!Number.isFinite(valor) || valor < 0) throw new ErroDeValidacao(`${campo} não pode ser negativo.`);
  return valor;
}

/**
 * Data no formato AAAA-MM-DD, ou vazia.
 * @throws ErroDeValidacao em formato inválido
 */
export function validarDataOpcional(valor: string | null | undefined, campo: string): string | null {
  const texto = normalizarTextoOpcional(valor);
  if (texto && !/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw new ErroDeValidacao(`${campo} deve estar no formato AAAA-MM-DD.`);
  return texto;
}

/**
 * Valida as operações do template.
 * @param operacoes descrição, máquina e pçs/hora
 * @returns operações normalizadas, na ordem recebida
 */
export function validarOperacoesDoItem(
  operacoes: readonly { descricao: string; maquina?: string | null; pecasHora?: number | null }[],
): { descricao: string; maquina: string | null; pecasHora: number | null }[] {
  if (operacoes.length > LIMITE_OPERACOES) {
    throw new ErroDeValidacao(`O item pode ter no máximo ${LIMITE_OPERACOES} operações.`);
  }
  return operacoes.map((operacao) => {
    const pecasHora = operacao.pecasHora ?? null;
    if (pecasHora !== null && (!Number.isFinite(pecasHora) || pecasHora < 0)) {
      throw new ErroDeValidacao('As peças por hora de uma operação não podem ser negativas.');
    }
    return {
      descricao: exigirTexto(operacao.descricao, 'A descrição da operação', 200),
      maquina: normalizarTextoOpcional(operacao.maquina),
      pecasHora,
    };
  });
}

// --- Checagens da AV de portfólio ------------------------------------------------------------------

export type AreaChecagem = 'produto' | 'processo' | 'pcp' | 'custo';
export type ResultadoChecagem = 'confere' | 'ressalvas' | 'diverge';

export const AREAS_DE_CHECAGEM: readonly AreaChecagem[] = ['produto', 'processo', 'pcp', 'custo'];
export const RESULTADOS_DE_CHECAGEM: readonly ResultadoChecagem[] = ['confere', 'ressalvas', 'diverge'];

export interface ChecagemPortfolio {
  avId: string;
  area: AreaChecagem;
  resultado: ResultadoChecagem;
  observacao: string | null;
  atualizadoEm: Date;
  atualizadoPor: string | null;
}

/** Foto dos custos de referência na checagem e os valores atualizados pelo Custo. */
export interface CustosDaAvPortfolio {
  avId: string;
  referencia: CustosDeReferencia & { atualizadosEm: string | null };
  novos: CustosDeReferencia;
  atualizadoEm: Date;
  atualizadoPor: string | null;
}

export interface RepositorioChecagensPortfolio {
  listar(avId: string): Promise<ChecagemPortfolio[]>;
  salvar(checagem: ChecagemPortfolio): Promise<void>;
  obterCustos(avId: string): Promise<CustosDaAvPortfolio | null>;
  salvarCustos(custos: CustosDaAvPortfolio): Promise<void>;
}

/**
 * Observação obrigatória quando a área não confirma ("com ressalvas" ou "não confere").
 * @param resultado conclusão da área
 * @param observacao texto informado
 * @returns observação normalizada
 * @throws ErroDeValidacao sem observação para ressalvas/divergência, ou longa demais
 */
export function validarObservacaoDaChecagem(resultado: ResultadoChecagem, observacao: string | null | undefined): string | null {
  const texto = normalizarTextoOpcional(observacao);
  if (resultado !== 'confere' && !texto) {
    throw new ErroDeValidacao('Descreva as ressalvas ou divergências na observação.');
  }
  if (texto && texto.length > 2000) throw new ErroDeValidacao('A observação pode ter no máximo 2000 caracteres.');
  return texto;
}
