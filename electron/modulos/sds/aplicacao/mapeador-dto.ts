import type { SdDTO } from '@contratos/sds.contrato';
import { trocarPrefixoDoNumero, type SdListada } from '../dominio/sd';

export function paraSdDTO({ sd, avNumero, cliente, descricao }: SdListada): SdDTO {
  return {
    id: sd.id,
    numero: sd.numero,
    avId: sd.avId,
    avNumero,
    cliente,
    descricao,
    status: sd.status,
    numeroProjeto: trocarPrefixoDoNumero(avNumero, 'PRO'),
    criadoEm: sd.criadoEm.toISOString(),
  };
}
