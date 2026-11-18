import type { Migracao } from '../migrador';

// Embalagem na estrutura do produto: a pessoa informa quantas peças cabem na embalagem e a quantidade do item
// na estrutura passa a ser a fração 1/peças (ex.: 50 pç/cx → 0,02 cx por peça). Nulo = item antigo ou de
// outro tipo, com a quantidade digitada à mão.
export const migracao0046: Migracao = {
  versao: 46,
  nome: '0046-estrutura-pecas-por-embalagem',
  sql: `
    ALTER TABLE av_estrutura_produto ADD COLUMN pecas_por_embalagem INTEGER CHECK (pecas_por_embalagem IS NULL OR pecas_por_embalagem >= 1);
  `,
};
