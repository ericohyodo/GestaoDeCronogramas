import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { normalizarTextoOpcional } from '../../../nucleo/dominio/texto';
import type { Area } from './area';

export type SecaoCustoMaterial = 'materia_prima' | 'outros_insumos' | 'embalagem';
export type Incoterm =
  | 'EXW'
  | 'FOB'
  | 'CIF'
  | 'DDP'
  | 'FCA'
  | 'CPT'
  | 'CIP'
  | 'DAT'
  | 'DAP'
  | 'FAS'
  | 'CFR';

export const AREA_MAPA_DE_CUSTO: Area = 'custo';

export interface ItemCustoMaterial {
  id: string;
  secao: SecaoCustoMaterial;
  codigoItem: string | null;
  descricao: string;
  qtdeBruta: number | null;
  qtdeNet: number | null;
  unidadeMedida: string | null;
  custoUnitario: number | null;
  custoTotal: number | null;
  ordem: number;
}

export interface ItemCustoProcesso {
  id: string;
  ordem: number;
  processo: string | null;
  maquina: string | null;
  pecasHora: number | null;
  qtdeColaboradores: number | null;
  taxaMod: number | null;
  taxaMoi: number | null;
  taxaGgf: number | null;
  custoTotal: number | null;
}

export interface SecaoCusto {
  avId: string;
  incoterm: Incoterm | null;
  observacoes: string | null;
  atualizadoEm: Date | null;
  atualizadoPor: string | null;
}

const TAMANHO_MAXIMO_DESCRICAO_ITEM = 200;

export function validarDescricaoDoItem(descricao: string): string {
  const texto = descricao.trim();
  if (!texto) throw new ErroDeValidacao('A descrição do item de custo é obrigatória.');
  if (texto.length > TAMANHO_MAXIMO_DESCRICAO_ITEM) {
    throw new ErroDeValidacao(
      `A descrição do item deve ter no máximo ${TAMANHO_MAXIMO_DESCRICAO_ITEM} caracteres.`,
    );
  }
  return texto;
}

export function normalizarTextoDoItem(valor: string | null | undefined): string | null {
  return normalizarTextoOpcional(valor);
}
