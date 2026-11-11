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
  devolucaoMotivo: string | null;
  devolucaoPorNome: string | null;
  devolucaoEm: string | null;
  /** Projeto criado no aceite. */
  cronogramaId: string | null;
  /** Versão lida (gravação otimista). */
  versao: number;
}

export interface SalvarSdEntrada {
  id: string;
  versaoEsperada?: number | null;
  dataEnvioCotacao?: string | null;
  numeroPo?: string | null;
  observacoes?: string | null;
}

export interface AceitarSdEntrada {
  id: string;
  /** Período previsto do projeto que nasce no aceite (AAAA-MM-DD). */
  dataInicio: string;
  dataFim: string;
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
