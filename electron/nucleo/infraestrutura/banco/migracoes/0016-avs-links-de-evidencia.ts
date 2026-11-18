import type { Migracao } from '../migrador';

// Um campo de link por item do checklist "Dados de Entrada Técnica" — caminho de pasta (rede/local)
// ou URL onde ficam as evidências daquele item, aberto pelo processo principal (shell.openPath/openExternal).
export const migracao0016: Migracao = {
  versao: 16,
  nome: '0016-avs-links-de-evidencia',
  sql: `
    ALTER TABLE av_secao_produto ADD COLUMN descritivo_tecnico_link TEXT;
    ALTER TABLE av_secao_produto ADD COLUMN desenho_2d_link TEXT;
    ALTER TABLE av_secao_produto ADD COLUMN desenho_3d_link TEXT;
    ALTER TABLE av_secao_produto ADD COLUMN desenho_interfaces_link TEXT;
    ALTER TABLE av_secao_produto ADD COLUMN normas_tecnicas_link TEXT;
    ALTER TABLE av_secao_produto ADD COLUMN requisitos_cliente_link TEXT;
    ALTER TABLE av_secao_produto ADD COLUMN requisitos_garantia_link TEXT;
  `,
};
