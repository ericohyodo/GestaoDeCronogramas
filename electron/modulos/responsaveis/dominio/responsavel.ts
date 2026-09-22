import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';

const TAMANHO_MAXIMO_NOME = 120;
const TAMANHO_MAXIMO_FUNCAO = 80;
const FORMATO_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface PropsResponsavel {
  id: string;
  nome: string;
  email: string | null;
  funcao: string | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DadosNovoResponsavel {
  id: string;
  nome: string;
  email?: string | null;
  funcao?: string | null;
  agora: Date;
}

export class Responsavel {
  private constructor(private props: PropsResponsavel) {}

  static criar(dados: DadosNovoResponsavel): Responsavel {
    return new Responsavel({
      id: dados.id,
      nome: validarNome(dados.nome),
      email: validarEmail(dados.email),
      funcao: validarFuncao(dados.funcao),
      ativo: true,
      criadoEm: dados.agora,
      atualizadoEm: dados.agora,
    });
  }

  static reconstituir(props: PropsResponsavel): Responsavel {
    return new Responsavel({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get nome(): string {
    return this.props.nome;
  }
  get email(): string | null {
    return this.props.email;
  }
  get funcao(): string | null {
    return this.props.funcao;
  }
  get ativo(): boolean {
    return this.props.ativo;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }

  renomear(nome: string, agora: Date): void {
    this.props.nome = validarNome(nome);
    this.props.atualizadoEm = agora;
  }

  alterarContato(email: string | null, funcao: string | null, agora: Date): void {
    this.props.email = validarEmail(email);
    this.props.funcao = validarFuncao(funcao);
    this.props.atualizadoEm = agora;
  }

  definirAtivo(ativo: boolean, agora: Date): void {
    this.props.ativo = ativo;
    this.props.atualizadoEm = agora;
  }
}

function validarNome(nome: string): string {
  return exigirTexto(nome, 'O nome do responsável', TAMANHO_MAXIMO_NOME);
}

function validarEmail(email: string | null | undefined): string | null {
  const texto = normalizarTextoOpcional(email);
  if (texto !== null && !FORMATO_EMAIL.test(texto)) {
    throw new ErroDeValidacao('E-mail inválido.');
  }
  return texto;
}

function validarFuncao(funcao: string | null | undefined): string | null {
  const texto = normalizarTextoOpcional(funcao);
  return texto === null ? null : exigirTexto(texto, 'A função', TAMANHO_MAXIMO_FUNCAO);
}
