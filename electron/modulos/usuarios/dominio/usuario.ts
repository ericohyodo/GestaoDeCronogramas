import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';
import { normalizarLogin } from './credenciais';
import { type Perfil, type Permissao, permissoesDoPerfil, validarPerfil } from './perfil';

const TAMANHO_MAXIMO_NOME = 120;

/** Departamentos da empresa (cadastro de usuários). */
export const DEPARTAMENTOS = [
  'Comercial',
  'Engenharia de Processo',
  'Engenharia de Produto',
  'Gestão de Projetos',
  'Qualidade',
  'PCP',
  'Financeiro',
] as const;

export interface PropsUsuario {
  id: string;
  nome: string;
  login: string;
  /** E-mail para o futuro status report automático (opcional). */
  email: string | null;
  senhaHash: string;
  perfil: Perfil;
  /** Departamento (Comercial, PCP…); texto livre para não travar quem já existe. */
  departamento: string | null;
  /** Primeiro acesso pendente: no próximo login a pessoa cadastra e-mail e cria a senha. */
  precisaDefinirSenha: boolean;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  ultimoAcessoEm: Date | null;
}

export interface DadosNovoUsuario {
  id: string;
  nome: string;
  login: string;
  email?: string | null;
  senhaHash: string;
  perfil: string;
  departamento?: string | null;
  /** Criado sem senha: define no primeiro acesso. */
  precisaDefinirSenha?: boolean;
  agora: Date;
}

export class Usuario {
  private constructor(private props: PropsUsuario) {}

  static criar(dados: DadosNovoUsuario): Usuario {
    return new Usuario({
      id: dados.id,
      nome: validarNome(dados.nome),
      login: normalizarLogin(dados.login),
      email: validarEmail(dados.email),
      senhaHash: dados.senhaHash,
      perfil: validarPerfil(dados.perfil),
      departamento: normalizarTextoOpcional(dados.departamento),
      precisaDefinirSenha: dados.precisaDefinirSenha ?? false,
      ativo: true,
      criadoEm: dados.agora,
      atualizadoEm: dados.agora,
      ultimoAcessoEm: null,
    });
  }

  static reconstituir(props: PropsUsuario): Usuario {
    return new Usuario({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get nome(): string {
    return this.props.nome;
  }
  get login(): string {
    return this.props.login;
  }
  get email(): string | null {
    return this.props.email;
  }
  get departamento(): string | null {
    return this.props.departamento;
  }
  get precisaDefinirSenha(): boolean {
    return this.props.precisaDefinirSenha;
  }
  get senhaHash(): string {
    return this.props.senhaHash;
  }
  get perfil(): Perfil {
    return this.props.perfil;
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
  get ultimoAcessoEm(): Date | null {
    return this.props.ultimoAcessoEm;
  }

  get permissoes(): Permissao[] {
    return permissoesDoPerfil(this.props.perfil);
  }

  possuiPermissao(permissao: Permissao): boolean {
    return this.permissoes.includes(permissao);
  }

  renomear(nome: string, agora: Date): void {
    this.props.nome = validarNome(nome);
    this.props.atualizadoEm = agora;
  }

  alterarEmail(email: string | null, agora: Date): void {
    this.props.email = validarEmail(email);
    this.props.atualizadoEm = agora;
  }

  alterarDepartamento(departamento: string | null, agora: Date): void {
    this.props.departamento = normalizarTextoOpcional(departamento);
    this.props.atualizadoEm = agora;
  }

  /**
   * Conclui o primeiro acesso: grava o e-mail (obrigatório aqui) e a senha criada pela própria pessoa.
   * @param senhaHash hash da senha nova (já validada)
   */
  concluirPrimeiroAcesso(email: string, senhaHash: string, agora: Date): void {
    const informado = validarEmail(email);
    if (!informado) throw new ErroDeValidacao('Informe o seu e-mail.');
    if (!senhaHash) throw new ErroDeValidacao('Hash de senha inválido.');
    this.props.email = informado;
    this.props.senhaHash = senhaHash;
    this.props.precisaDefinirSenha = false;
    this.props.atualizadoEm = agora;
  }

  /** O administrador pede que a pessoa refaça o primeiro acesso (e-mail e senha nova). */
  exigirPrimeiroAcesso(agora: Date): void {
    this.props.precisaDefinirSenha = true;
    this.props.senhaHash = '!primeiro-acesso';
    this.props.atualizadoEm = agora;
  }

  alterarPerfil(perfil: string, agora: Date): void {
    this.props.perfil = validarPerfil(perfil);
    this.props.atualizadoEm = agora;
  }

  definirAtivo(ativo: boolean, agora: Date): void {
    this.props.ativo = ativo;
    this.props.atualizadoEm = agora;
  }

  definirSenhaHash(senhaHash: string, agora: Date): void {
    if (!senhaHash) throw new ErroDeValidacao('Hash de senha inválido.');
    this.props.senhaHash = senhaHash;
    this.props.precisaDefinirSenha = false;
    this.props.atualizadoEm = agora;
  }

  registrarAcesso(agora: Date): void {
    this.props.ultimoAcessoEm = agora;
  }
}

/** E-mail opcional; quando informado, precisa ter formato válido (minúsculas, sem espaços). */
function validarEmail(email: string | null | undefined): string | null {
  const texto = normalizarTextoOpcional(email)?.toLowerCase() ?? null;
  if (texto !== null && (texto.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(texto))) {
    throw new ErroDeValidacao('E-mail inválido.');
  }
  return texto;
}

function validarNome(nome: string): string {
  return exigirTexto(nome, 'O nome', TAMANHO_MAXIMO_NOME);
}
