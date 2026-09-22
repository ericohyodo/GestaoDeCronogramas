import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';

export const TEMAS = ['sistema', 'claro', 'escuro'] as const;
export type Tema = (typeof TEMAS)[number];

export const TEMA_PADRAO: Tema = 'sistema';

export function validarTema(valor: string): Tema {
  if (!(TEMAS as readonly string[]).includes(valor)) {
    throw new ErroDeValidacao(`Tema inválido: "${valor}".`);
  }
  return valor as Tema;
}
