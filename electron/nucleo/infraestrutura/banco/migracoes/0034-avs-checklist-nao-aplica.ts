import type { Migracao } from '../migrador';

// Checklist "Dados de Entrada Técnica" da Eng. Produto: terceira opção "N/A" por item, para registrar que o
// item foi visto mas não se aplica a esta AV (antes só havia Existente e Disponível).
export const migracao0034: Migracao = {
  versao: 34,
  nome: '0034-avs-checklist-nao-aplica',
  sql: `
    ALTER TABLE av_secao_produto ADD COLUMN descritivo_tecnico_nao_aplica INTEGER;
    ALTER TABLE av_secao_produto ADD COLUMN desenho_2d_nao_aplica INTEGER;
    ALTER TABLE av_secao_produto ADD COLUMN desenho_3d_nao_aplica INTEGER;
    ALTER TABLE av_secao_produto ADD COLUMN desenho_interfaces_nao_aplica INTEGER;
    ALTER TABLE av_secao_produto ADD COLUMN normas_tecnicas_nao_aplica INTEGER;
    ALTER TABLE av_secao_produto ADD COLUMN requisitos_cliente_nao_aplica INTEGER;
    ALTER TABLE av_secao_produto ADD COLUMN requisitos_garantia_nao_aplica INTEGER;
  `,
};
