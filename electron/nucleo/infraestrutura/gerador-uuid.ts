import { randomUUID } from 'node:crypto';
import type { GeradorDeId } from '../aplicacao/portas/gerador-de-id';

export class GeradorUuid implements GeradorDeId {
  gerar(): string {
    return randomUUID();
  }
}
