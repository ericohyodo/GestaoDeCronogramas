import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';

export type TipoTemplateAv = 'operacoes' | 'custo_processo';

export interface TemplateAv {
  id: string;
  tipo: TipoTemplateAv;
  nome: string;
  /** Cópia das linhas da tabela; o formato é definido pelo tipo e validado na entrada. */
  itens: unknown[];
  usuarioId: string | null;
  criadoEm: Date;
}

const TAMANHO_MAXIMO_NOME = 100;

export function validarNomeDoTemplate(nome: string): string {
  const texto = nome.trim();
  if (!texto) throw new ErroDeValidacao('Informe um nome para o template.');
  if (texto.length > TAMANHO_MAXIMO_NOME) {
    throw new ErroDeValidacao(`O nome do template deve ter no máximo ${TAMANHO_MAXIMO_NOME} caracteres.`);
  }
  return texto;
}

export interface RepositorioTemplatesAv {
  listar(tipo: TipoTemplateAv): Promise<TemplateAv[]>;
  /** Substitui o template de mesmo tipo e nome (sem diferenciar maiúsculas), se existir. */
  salvar(template: TemplateAv): Promise<TemplateAv>;
  excluir(id: string): Promise<void>;
}
