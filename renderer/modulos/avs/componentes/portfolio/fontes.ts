import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';
import type { FonteDeAnexos } from '../AnexosGaleria';

/**
 * Desenho de referência de um item de portfólio, para a galeria de anexos.
 * @param itemId item dono dos arquivos
 * @returns a fonte (crie uma vez por item, com `useMemo`)
 */
export function fonteDoItemPortfolio(itemId: string): FonteDeAnexos {
  return {
    listar: async () => (await clienteDesktop.portfolio.obterItem(itemId)).anexos,
    anexar: () => clienteDesktop.portfolio.anexarDesenho(itemId),
    obterConteudo: (id) => clienteDesktop.portfolio.obterConteudoDesenho(id),
    abrir: (id) => clienteDesktop.portfolio.abrirDesenho(id),
    excluir: (id) => clienteDesktop.portfolio.excluirDesenho(id),
  };
}
