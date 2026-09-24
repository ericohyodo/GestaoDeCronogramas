import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';

/** Falha esperada (arquivo travado, página que não carregou): a mensagem chega intacta à tela. */
export class ErroNaImpressao extends ErroDeDominio {
  constructor(mensagem: string) {
    super('IMPRESSAO', mensagem);
    this.name = 'ErroNaImpressao';
  }
}
