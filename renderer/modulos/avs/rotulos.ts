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
  {
    chave: 'descritivoTecnico',
    rotulo: 'Descritivo Técnico',
    ajuda: 'Documento que descreve o produto: função, material, dimensões críticas e especificações gerais.',
  },
  {
    chave: 'desenho2d',
    rotulo: 'Desenho de Produto 2D',
    ajuda: 'Desenho técnico em duas dimensões (vistas, cotas e tolerâncias) fornecido pelo cliente ou criado internamente.',
  },
  {
    chave: 'desenho3d',
    rotulo: 'Desenho de Produto 3D',
    ajuda: 'Modelo tridimensional (CAD) do produto, usado para projetar ferramental e simular a fabricação.',
  },
  {
    chave: 'desenhoInterfaces',
    rotulo: 'Desenho de Interfaces',
    ajuda: 'Desenho que mostra como o produto se conecta a outras peças ou ao conjunto do cliente (encaixes, fixações, folgas).',
  },
  {
    chave: 'normasTecnicas',
    rotulo: 'Normas Técnicas',
    ajuda: 'Normas e especificações que o produto precisa atender (ABNT, ISO, normas do cliente).',
  },
  {
    chave: 'requisitosCliente',
    rotulo: 'Requisitos Específicos do Cliente',
    ajuda: 'Exigências particulares do cliente: testes, certificações, acabamento, rastreabilidade, embalagem especial.',
  },
  {
    chave: 'requisitosGarantia',
    rotulo: 'Há requisitos de Garantia?',
    ajuda: 'Indica se o cliente exige garantia específica (prazo, condições, ensaios) para o produto.',
  },
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
