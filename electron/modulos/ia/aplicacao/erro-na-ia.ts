import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';

/** Falha esperada (sem chave, chave inválida, sem internet): a mensagem chega intacta à tela. */
export class ErroNaIa extends ErroDeDominio {
  constructor(mensagem: string) {
    super('IA', mensagem);
    this.name = 'ErroNaIa';
  }
}
