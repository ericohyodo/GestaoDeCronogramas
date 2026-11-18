import type { Migracao } from '../migrador';

// PCP: em cada bloco opcional (Layout da fábrica, Custos logísticos, Observações) o PCP pode declarar
// "Sem alterações significativas" em vez de preencher. A declaração libera o bloco e fica registrada.
export const migracao0047: Migracao = {
  versao: 47,
  nome: '0047-pcp-sem-alteracoes',
  sql: `
    ALTER TABLE av_secao_pcp ADD COLUMN layout_sem_alteracoes      INTEGER NOT NULL DEFAULT 0 CHECK (layout_sem_alteracoes IN (0, 1));
    ALTER TABLE av_secao_pcp ADD COLUMN custos_sem_alteracoes      INTEGER NOT NULL DEFAULT 0 CHECK (custos_sem_alteracoes IN (0, 1));
    ALTER TABLE av_secao_pcp ADD COLUMN observacoes_sem_alteracoes INTEGER NOT NULL DEFAULT 0 CHECK (observacoes_sem_alteracoes IN (0, 1));
  `,
};
