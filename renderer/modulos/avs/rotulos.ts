import type {
  AreaAvDTO,
  ClassificacaoInvestimentoDTO,
  EtapaDeDeclinioDTO,
  SecaoCustoMaterialDTO,
} from '@contratos/avs.contrato';
import type { Tom } from '@/compartilhado/ui/Etiqueta';

export const ROTULO_AREA: Record<AreaAvDTO, string> = {
  comercial: 'Comercial',
  produto: 'Eng. Produto',
  processo: 'Eng. Processo',
  pcp: 'PCP',
  custo: 'Mapa de Custo',
};

export const ROTULO_SECAO_CUSTO_MATERIAL: Record<SecaoCustoMaterialDTO, string> = {
  materia_prima: 'Matéria-prima',
  outros_insumos: 'Outros insumos',
  embalagem: 'Embalagem',
};

export const ROTULO_CLASSIFICACAO_INVESTIMENTO: Record<ClassificacaoInvestimentoDTO, string> = {
  capex: 'Capex',
  suporte_desenvolvimento: 'Suporte Desenvolvimento',
  sup_des_ou_cliente: 'Sup. Des. ou Cliente',
  cliente: 'Cliente',
};

/** Itens do checklist "Dados de Entrada Técnica" — cada um vira um par de campos `<chave>Existente`/`<chave>Disponivel`. */
export const ITENS_CHECKLIST_PRODUTO = [
  { chave: 'descritivoTecnico', rotulo: 'Descritivo Técnico' },
  { chave: 'desenho2d', rotulo: 'Desenho de Produto 2D' },
  { chave: 'desenho3d', rotulo: 'Desenho de Produto 3D' },
  { chave: 'desenhoInterfaces', rotulo: 'Desenho de Interfaces' },
  { chave: 'normasTecnicas', rotulo: 'Normas Técnicas' },
  { chave: 'requisitosCliente', rotulo: 'Requisitos Específicos do Cliente' },
  { chave: 'requisitosGarantia', rotulo: 'Há requisitos de Garantia?' },
] as const;

/** Tom da etiqueta por chave de etapa — declínios em perigo, conclusão em sucesso, resto neutro/info. */
export function tomDaEtapa(chave: string): Tom {
  if (chave === 'declinada_cliente' || chave === 'declinada_empresa') return 'perigo';
  if (chave === 'projeto_criado') return 'sucesso';
  if (chave === 'sd_aberta' || chave === 'proposta_enviada') return 'destaque';
  return 'info';
}

export const ROTULO_ETAPA_DECLINIO: Record<EtapaDeDeclinioDTO, string> = {
  declinada_cliente: 'Declinada pelo cliente',
  declinada_empresa: 'Declinada internamente',
};
