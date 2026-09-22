import { ErroDeDominio, ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';

const FORMATO_LOGIN = /^[a-z0-9._-]{3,32}$/;
const TAMANHO_MINIMO_SENHA = 8;
const TAMANHO_MAXIMO_SENHA = 128;

export class ErroCredenciaisInvalidas extends ErroDeDominio {
  constructor() {
    // Mensagem propositalmente genérica: não revela se o login existe.
    super('CREDENCIAIS_INVALIDAS', 'Usuário ou senha incorretos.');
    this.name = 'ErroCredenciaisInvalidas';
  }
}

export class ErroUsuarioInativo extends ErroDeDominio {
  constructor() {
    super('USUARIO_INATIVO', 'Este usuário está desativado. Procure um administrador.');
    this.name = 'ErroUsuarioInativo';
  }
}

/** Normaliza para minúsculas: o login não diferencia maiúsculas de minúsculas. */
export function normalizarLogin(valor: string): string {
  const login = valor.trim().toLowerCase();
  if (!FORMATO_LOGIN.test(login)) {
    throw new ErroDeValidacao(
      'O usuário deve ter de 3 a 32 caracteres, usando apenas letras, números, ponto, hífen ou sublinhado.',
    );
  }
  return login;
}

/** Valida a senha em texto puro antes de gerar o hash; o domínio nunca guarda a senha. */
export function validarSenha(senha: string): string {
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    throw new ErroDeValidacao(`A senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
  }
  if (senha.length > TAMANHO_MAXIMO_SENHA) {
    throw new ErroDeValidacao(`A senha deve ter no máximo ${TAMANHO_MAXIMO_SENHA} caracteres.`);
  }
  return senha;
}
