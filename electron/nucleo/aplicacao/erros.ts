import { ErroDeDominio } from '../dominio/erro-de-dominio';

export class ErroNaoEncontrado extends ErroDeDominio {
  constructor(recurso: string) {
    super('NAO_ENCONTRADO', `${recurso} não encontrado.`);
    this.name = 'ErroNaoEncontrado';
  }
}
