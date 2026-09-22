import type { Relogio } from '../aplicacao/portas/relogio';

export class RelogioDoSistema implements Relogio {
  agora(): Date {
    return new Date();
  }
}
