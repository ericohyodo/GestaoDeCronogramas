import type { EtapaAvDTO } from '@contratos/avs.contrato';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { tomDaEtapa } from '../rotulos';

export function EtapaBadge({ etapa }: { etapa: EtapaAvDTO }) {
  return <Etiqueta tom={tomDaEtapa(etapa.chave)}>{etapa.nome}</Etiqueta>;
}
