import { diaLocal, somarDiasUteis } from '../../../nucleo/dominio/calendario';

// =====================================================================================================
// Prazo da área: cada área da AV (Produto, Processo, PCP, Custo) tem N dias úteis para preencher a sua aba,
// contados a partir do dia em que a etapa chega a ela. O prazo vence no fim do dia-limite.
// =====================================================================================================

export type AreaComPrazo = 'produto' | 'processo' | 'pcp' | 'custo';

/** Etapas com prazo e a área de cada uma (Comercial e etapas 6 a 10 não têm prazo). */
export const AREA_DA_ETAPA_COM_PRAZO: Readonly<Record<number, AreaComPrazo>> = {
  2: 'produto',
  3: 'processo',
  4: 'pcp',
  5: 'custo',
};

export const AREAS_COM_PRAZO: readonly AreaComPrazo[] = ['produto', 'processo', 'pcp', 'custo'];

/** Prazo padrão de cada área, em dias úteis. */
export const DIAS_UTEIS_PADRAO = 3;
export const DIAS_UTEIS_MINIMO = 1;
export const DIAS_UTEIS_MAXIMO = 30;

export interface PrazoArea {
  id: string;
  avId: string;
  etapa: number;
  area: AreaComPrazo;
  /** Dias úteis copiados da configuração no momento em que a etapa chegou à área. */
  diasUteis: number;
  iniciadaEm: Date;
  /** Último dia do prazo (AAAA-MM-DD); vence no fim desse dia. */
  dataLimite: string;
  /** Quando a etapa saiu da área (avançou, foi finalizada ou declinada); `null` = em aberto. */
  entregueEm: Date | null;
}

export type SituacaoPrazoArea = 'no_prazo' | 'vencendo' | 'atrasada' | 'entregue_no_prazo' | 'entregue_com_atraso';

/**
 * Situação do prazo num dia.
 * @param prazo data-limite e entrega
 * @param hoje dia de referência (AAAA-MM-DD, fuso local)
 * @returns `vencendo` no dia-limite e no dia útil anterior; `atrasada` depois do limite sem entrega
 */
export function situacaoDoPrazo(prazo: Pick<PrazoArea, 'dataLimite' | 'entregueEm'>, hoje: string): SituacaoPrazoArea {
  if (prazo.entregueEm) {
    return diaLocal(prazo.entregueEm) <= prazo.dataLimite ? 'entregue_no_prazo' : 'entregue_com_atraso';
  }
  if (hoje > prazo.dataLimite) return 'atrasada';
  if (hoje === prazo.dataLimite || somarDiasUteis(hoje, 1) === prazo.dataLimite) return 'vencendo';
  return 'no_prazo';
}

export interface RepositorioPrazosArea {
  /** Grava o prazo; se já existe prazo para a etapa da AV, não faz nada. */
  abrir(prazo: PrazoArea): Promise<void>;
  /** Marca a entrega do prazo aberto da etapa (sem efeito se já entregue ou inexistente). */
  entregar(avId: string, etapa: number, instante: Date): Promise<void>;
  obterAberto(avId: string, etapa: number): Promise<PrazoArea | null>;
  listarAbertos(): Promise<PrazoArea[]>;
  /** Prazos entregues a partir do instante ISO informado. */
  listarEntreguesDesde(desdeIso: string): Promise<PrazoArea[]>;
  /** Troca a data-limite do prazo aberto (usado só pelos dados do modo Apresentação). */
  redefinirLimite(avId: string, etapa: number, dataLimite: string): Promise<void>;
}

export type ConfigPrazos = Record<AreaComPrazo, number>;

export interface RepositorioConfigPrazos {
  obter(): Promise<ConfigPrazos>;
  salvar(valores: ConfigPrazos, usuarioId: string, instante: Date): Promise<void>;
}
