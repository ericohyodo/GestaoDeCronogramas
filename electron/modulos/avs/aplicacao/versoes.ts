import type { Area } from '../dominio/area';

/** Chave do controle de versão de uma seção (aba) da AV: cada aba é gravada e versionada à parte. */
export function chaveDaSecao(avId: string, area: Area): string {
  return `av-${area}:${avId}`;
}
