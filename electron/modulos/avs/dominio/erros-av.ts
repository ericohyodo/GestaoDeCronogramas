import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';

export class ErroSemPermissaoNaArea extends ErroDeDominio {
  constructor() {
    super('SEM_PERMISSAO_AREA', 'Você não tem permissão para editar esta área da AV.');
    this.name = 'ErroSemPermissaoNaArea';
  }
}
