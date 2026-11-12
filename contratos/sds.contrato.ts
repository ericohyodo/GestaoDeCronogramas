export const STATUS_SD = ['pre_sd', 'aberta', 'fechada', 'cancelada'] as const;
export type StatusSdDTO = (typeof STATUS_SD)[number];

export interface SdDTO {
  id: string;
  /** Mesmo sequencial e ano da AV de origem: AV 26-007 → SD 26-007. */
  numero: string;
  avId: string;
  avNumero: string;
  cliente: string | null;
  descricao: string;
  status: StatusSdDTO;
  /** Número que o projeto terá no módulo de Projetos (PRO 26-007). */
  numeroProjeto: string;
  /** Criada antes do uso multiusuário: marcada como histórico (prefixo H-). */
  historico: boolean;
  criadoEm: string;
  /** Data (AAAA-MM-DD) em que a cotação foi enviada ao cliente. */
  dataEnvioCotacao: string | null;
  numeroPo: string | null;
  observacoes: string | null;
  /** Responsável pelo Comercial na AV: quem preenche e abre a SD. */
  responsavelComercialId: string | null;
  responsavelComercialNome: string | null;
  abertaPorNome: string | null;
  abertaEm: string | null;
  aceitePorNome: string | null;
  aceiteEm: string | null;
  /** Observações da Engenharia registradas no aceite. */
  parecerAceite: string | null;
  devolucaoMotivo: string | null;
  devolucaoPorNome: string | null;
  devolucaoEm: string | null;
  /** Projeto criado no aceite. */
  cronogramaId: string | null;
  /** Prazo acordado com o cliente, em dias corridos (lead time). */
  leadTimeDias: number | null;
  /** Observação do Comercial sobre o prazo acordado. */
  leadTimeObservacao: string | null;
  /** Justificativa da Engenharia quando o término do PRO difere de início + lead time. */
  prazoJustificativa: string | null;
  /** Versão lida (gravação otimista). */
  versao: number;
}

export interface SalvarSdEntrada {
  id: string;
  versaoEsperada?: number | null;
  dataEnvioCotacao?: string | null;
  numeroPo?: string | null;
  observacoes?: string | null;
  /** Lead time acordado com o cliente (dias corridos, 1 a 1825). */
  leadTimeDias?: number | null;
  leadTimeObservacao?: string | null;
}

export interface AceitarSdEntrada {
  id: string;
  /** Período previsto do projeto que nasce no aceite (AAAA-MM-DD). */
  dataInicio: string;
  dataFim: string;
  /** Parecer da Engenharia (observações, inconsistências). Opcional no aceite. */
  parecer?: string | null;
}

export interface DevolverSdEntrada {
  id: string;
  motivo: string;
}

/** Evidência de oficialização do cliente: PO, e-mail (.msg/.eml) ou documento. */
export interface AnexoSdDTO {
  id: string;
  nomeArquivo: string;
  tipoMime: string | null;
  tamanhoBytes: number;
  usuarioNome: string | null;
  criadoEm: string;
}
