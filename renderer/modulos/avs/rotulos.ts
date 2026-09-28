import type { AreaAvDTO, EtapaDeDeclinioDTO } from '@contratos/avs.contrato';
import type { Tom } from '@/compartilhado/ui/Etiqueta';

export const ROTULO_AREA: Record<AreaAvDTO, string> = {
  comercial: 'Comercial',
  produto: 'Eng. Produto',
  processo: 'Eng. Processo',
  pcp: 'PCP',
  custo: 'Mapa de Custo',
};

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
