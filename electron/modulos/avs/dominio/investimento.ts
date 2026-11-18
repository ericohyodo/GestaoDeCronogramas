import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';

export type AreaInvestimento = 'produto' | 'processo';
export type ClassificacaoInvestimento =
  | 'capex'
  | 'suporte_desenvolvimento'
  | 'sup_des_ou_cliente'
  | 'cliente';

export interface Investimento {
  id: string;
  avId: string;
  area: AreaInvestimento;
  descricao: string;
  classificacao: ClassificacaoInvestimento | null;
  valor: number | null;
  ordem: number;
}

const TAMANHO_MAXIMO_DESCRICAO = 200;

export function validarDescricaoDoInvestimento(descricao: string): string {
  const texto = descricao.trim();
  if (!texto) throw new ErroDeValidacao('A descrição do item de investimento é obrigatória.');
  if (texto.length > TAMANHO_MAXIMO_DESCRICAO) {
    throw new ErroDeValidacao(
      `A descrição do item deve ter no máximo ${TAMANHO_MAXIMO_DESCRICAO} caracteres.`,
    );
  }
  return texto;
}
