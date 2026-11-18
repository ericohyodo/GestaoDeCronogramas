// =====================================================================================================
// Reportes de erro e sugestões: enviados por qualquer usuário, acompanhados pelo administrador.
// =====================================================================================================

export const TIPOS_REPORTE = ['erro', 'sugestao'] as const;
export type TipoReporteDTO = (typeof TIPOS_REPORTE)[number];

/** `aberto` → `em_analise` → `resolvido` (dar baixa) ou `descartado`; dá para reabrir. */
export const STATUS_REPORTE = ['aberto', 'em_analise', 'resolvido', 'descartado'] as const;
export type StatusReporteDTO = (typeof STATUS_REPORTE)[number];

/** Limites conferidos na tela e de novo no processo principal. */
export const LIMITES_REPORTE = {
  texto: 4000,
  comentario: 1000,
  imagens: 3,
  bytesPorImagem: 10 * 1024 * 1024,
} as const;

/** Print anexado: conteúdo em base64 (sem o prefixo `data:`). Aceita PNG, JPEG e BMP. */
export interface ImagemReporteEntrada {
  nomeArquivo: string;
  base64: string;
}

export interface CriarReporteEntrada {
  tipo: TipoReporteDTO;
  texto: string;
  /** Tela em que a pessoa estava (ajuda a reproduzir o erro). */
  rota?: string | null;
  imagens: ImagemReporteEntrada[];
}

export interface ReporteResumoDTO {
  id: string;
  /** Sequencial para conversa (ex.: "#12"). */
  numero: number;
  tipo: TipoReporteDTO;
  status: StatusReporteDTO;
  texto: string;
  autor: string | null;
  rota: string | null;
  versaoApp: string | null;
  quantidadeImagens: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ImagemReporteDTO {
  id: string;
  nomeArquivo: string;
  tipoMime: string;
  tamanhoBytes: number;
}

export type TipoEventoReporteDTO = 'criado' | 'status' | 'comentario';

/** Uma linha do log de alterações do reporte. */
export interface EventoReporteDTO {
  id: string;
  tipo: TipoEventoReporteDTO;
  statusDe: StatusReporteDTO | null;
  statusPara: StatusReporteDTO | null;
  comentario: string | null;
  autor: string | null;
  criadoEm: string;
}

export interface ReporteDetalheDTO extends ReporteResumoDTO {
  imagens: ImagemReporteDTO[];
  /** Mais antigos primeiro. */
  eventos: EventoReporteDTO[];
}

/** Muda o status (com comentário opcional) ou, com o mesmo status, só registra um comentário. */
export interface AndamentoReporteEntrada {
  id: string;
  status: StatusReporteDTO;
  comentario?: string | null;
}

export interface ConteudoImagemReporteDTO {
  nomeArquivo: string;
  tipoMime: string;
  base64: string;
}
