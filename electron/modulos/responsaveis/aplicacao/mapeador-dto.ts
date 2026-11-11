import type { ResponsavelDTO } from '@contratos/responsaveis.contrato';
import type { Responsavel } from '../dominio/responsavel';

export function paraResponsavelDTO(responsavel: Responsavel): ResponsavelDTO {
  return {
    id: responsavel.id,
    nome: responsavel.nome,
    email: responsavel.email,
    funcao: responsavel.funcao,
    usuarioId: responsavel.usuarioId,
    ativo: responsavel.ativo,
  };
}
