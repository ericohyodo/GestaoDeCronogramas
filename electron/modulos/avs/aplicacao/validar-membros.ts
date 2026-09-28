import type { AreaAvDTO } from '@contratos/avs.contrato';
import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';

/**
 * Confere que todo id de responsável indicado existe entre os usuários ativos, antes de gravar —
 * sem isso, um id inválido só falharia como violação de chave estrangeira do SQLite, um erro
 * interno sem sentido para quem está preenchendo o formulário.
 */
export function validarMembros(
  membros: Partial<Record<AreaAvDTO, string | null>> | undefined,
  ativos: { id: string; nome: string }[],
): void {
  if (!membros) return;
  const idsValidos = new Set(ativos.map((usuario) => usuario.id));
  for (const id of Object.values(membros)) {
    if (id && !idsValidos.has(id)) {
      throw new ErroDeValidacao('Responsável indicado não existe ou está inativo.');
    }
  }
}
