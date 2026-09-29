import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';

export interface ContatoAv {
  id: string;
  avId: string;
  ordem: number;
  nome: string;
  area: string | null;
  telefone: string | null;
  email: string | null;
}

export interface DadosContato {
  nome: string;
  area?: string | null;
  telefone?: string | null;
  email?: string | null;
}

/** Normaliza um contato; o nome é obrigatório e o e-mail, se houver, precisa ter formato válido. */
export function normalizarContato(dados: DadosContato): Omit<ContatoAv, 'id' | 'avId' | 'ordem'> {
  const email = normalizarTextoOpcional(dados.email);
  if (email !== null && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new ErroDeValidacao(`E-mail inválido: ${email}`);
  }
  const area = normalizarTextoOpcional(dados.area);
  const telefone = normalizarTextoOpcional(dados.telefone);
  if (area && area.length > 60) throw new ErroDeValidacao('A área do contato deve ter no máximo 60 caracteres.');
  if (telefone && telefone.length > 40) {
    throw new ErroDeValidacao('O telefone do contato deve ter no máximo 40 caracteres.');
  }
  return { nome: exigirTexto(dados.nome, 'O nome do contato', 120), area, telefone, email };
}

export interface RepositorioContatosAv {
  listar(avId: string): Promise<ContatoAv[]>;
  /** Substitui a lista de contatos da AV inteira. */
  substituir(avId: string, contatos: ContatoAv[]): Promise<void>;
}
