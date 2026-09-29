import {
  FILHOS_PERMITIDOS_NA_ESTRUTURA,
  TIPOS_NO_ESTRUTURA,
  type NoEstruturaEntrada,
} from '@contratos/avs.contrato';
import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';
import type { NoEstrutura, TipoNoEstrutura } from '../dominio/estrutura-produto';

export const LIMITE_DE_ITENS_DA_ESTRUTURA = 500;

/**
 * Valida a árvore enviada pela tela e a transforma em nós com ids próprios. A lista deve vir com o pai antes
 * dos filhos (ordem em profundidade); cada tipo só pode ficar sob os tipos permitidos (embalagens e insumos não têm filhos).
 */
export function montarEstrutura(
  entrada: readonly NoEstruturaEntrada[],
  avId: string,
  gerarId: () => string,
): NoEstrutura[] {
  if (entrada.length > LIMITE_DE_ITENS_DA_ESTRUTURA) {
    throw new ErroDeValidacao(`A estrutura pode ter no máximo ${LIMITE_DE_ITENS_DA_ESTRUTURA} itens.`);
  }
  const porChave = new Map<string, NoEstrutura>();

  return entrada.map((item, ordem) => {
    if (!(TIPOS_NO_ESTRUTURA as readonly string[]).includes(item.tipo)) {
      throw new ErroDeValidacao(`Tipo de item inválido na estrutura: ${item.tipo}.`);
    }
    if (porChave.has(item.chave)) throw new ErroDeValidacao('A estrutura tem itens repetidos.');

    const pai = item.paiChave === null ? null : (porChave.get(item.paiChave) ?? null);
    if (item.paiChave !== null && !pai) {
      throw new ErroDeValidacao('Um item da estrutura aponta para um pai que não existe.');
    }
    const permitidos: readonly TipoNoEstrutura[] = pai ? FILHOS_PERMITIDOS_NA_ESTRUTURA[pai.tipo] : TIPOS_NO_ESTRUTURA;
    if (!permitidos.includes(item.tipo)) {
      throw new ErroDeValidacao(
        pai
          ? `Um item do tipo "${item.tipo}" não pode ficar dentro de "${pai.tipo}".`
          : `Tipo de item inválido na estrutura: ${item.tipo}.`,
      );
    }
    if (item.quantidade != null && (!Number.isFinite(item.quantidade) || item.quantidade < 0)) {
      throw new ErroDeValidacao('A quantidade de um item da estrutura não pode ser negativa.');
    }

    const no: NoEstrutura = {
      id: gerarId(),
      avId,
      paiId: pai?.id ?? null,
      ordem,
      tipo: item.tipo,
      codigo: normalizarTextoOpcional(item.codigo),
      descricao: exigirTexto(item.descricao, 'A descrição do item da estrutura', 200),
      quantidade: item.quantidade ?? null,
      unidade: normalizarTextoOpcional(item.unidade),
    };
    porChave.set(item.chave, no);
    return no;
  });
}
