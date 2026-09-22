import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { exigirTexto } from '../../../nucleo/dominio/texto';
import { normalizarLogin } from './credenciais';
import { type Perfil, type Permissao, permissoesDoPerfil, validarPerfil } from './perfil';

const TAMANHO_MAXIMO_NOME = 120;

export interface PropsUsuario {
  id: string;
  nome: string;
  login: string;
  senhaHash: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  ultimoAcessoEm: Date | null;
}

export interface DadosNovoUsuario {
  id: string;
  nome: string;
  login: string;
  senhaHash: string;
  perfil: string;
  agora: Date;
}

export class Usuario {
  private constructor(private props: PropsUsuario) {}

  static criar(dados: DadosNovoUsuario): Usuario {
    return new Usuario({
      id: dados.id,
      nome: validarNome(dados.nome),
      login: normalizarLogin(dados.login),
      senhaHash: dados.senhaHash,
      perfil: validarPerfil(dados.perfil),
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
    this.props.atualizadoEm = agora;
  }

  registrarAcesso(agora: Date): void {
    this.props.ultimoAcessoEm = agora;
  }
}

function validarNome(nome: string): string {
  return exigirTexto(nome, 'O nome', TAMANHO_MAXIMO_NOME);
}
