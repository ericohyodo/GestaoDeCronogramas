import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { normalizarTextoOpcional } from '../../../nucleo/dominio/texto';

/** Uma etapa da sequência de fabricação definida pela Eng. Processo. */
export interface Operacao {
  id: string;
  avId: string;
  ordem: number;
  descricao: string;
  maquina: string | null;
  pecasHora: number | null;
}

const TAMANHO_MAXIMO_DESCRICAO = 200;

export function validarDescricaoDaOperacao(descricao: string): string {
  const texto = descricao.trim();
  if (!texto) throw new ErroDeValidacao('A descrição da operação é obrigatória.');
  if (texto.length > TAMANHO_MAXIMO_DESCRICAO) {
    throw new ErroDeValidacao(`A descrição da operação deve ter no máximo ${TAMANHO_MAXIMO_DESCRICAO} caracteres.`);
  }
  return texto;
}

export function normalizarMaquinaDaOperacao(maquina: string | null | undefined): string | null {
  return normalizarTextoOpcional(maquina);
}
