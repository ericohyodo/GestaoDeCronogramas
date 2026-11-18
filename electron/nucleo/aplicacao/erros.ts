import { ErroDeDominio } from '../dominio/erro-de-dominio';

export class ErroNaoEncontrado extends ErroDeDominio {
  constructor(recurso: string) {
    super('NAO_ENCONTRADO', `${recurso} não encontrado.`);
    this.name = 'ErroNaoEncontrado';
  }
}

/** Outro usuário gravou o mesmo trecho depois que esta tela o carregou. */
export class ErroConflitoDeEdicao extends ErroDeDominio {
  constructor() {
    super(
      'CONFLITO_DE_EDICAO',
      'Outro usuário salvou alterações neste trecho depois que você o abriu. Recarregue para ver a versão ' +
        'atual e refaça suas alterações (copie antes o que for preciso).',
    );
    this.name = 'ErroConflitoDeEdicao';
  }
}
