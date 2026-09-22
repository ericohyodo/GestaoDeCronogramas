/** Erro de regra de negócio. O `codigo` é estável e atravessa o IPC até a UI. */
export class ErroDeDominio extends Error {
  readonly codigo: string;

  constructor(codigo: string, mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeDominio';
    this.codigo = codigo;
  }
}

export class ErroDeValidacao extends ErroDeDominio {
  constructor(mensagem: string) {
    super('VALIDACAO', mensagem);
    this.name = 'ErroDeValidacao';
  }
}
