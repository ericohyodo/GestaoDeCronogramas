import { ErroDeValidacao } from './erro-de-dominio';

/** Remove espaços das pontas e exige conteúdo com até `maximo` caracteres. */
export function exigirTexto(valor: string, campo: string, maximo: number): string {
  const texto = valor.trim();
  if (!texto) throw new ErroDeValidacao(`${campo} é obrigatório.`);
  if (texto.length > maximo) {
    throw new ErroDeValidacao(`${campo} deve ter no máximo ${maximo} caracteres.`);
  }
  return texto;
}

/** Texto opcional: vazio ou só espaços vira `null`. */
export function normalizarTextoOpcional(valor: string | null | undefined): string | null {
  const texto = valor?.trim();
  return texto ? texto : null;
}
