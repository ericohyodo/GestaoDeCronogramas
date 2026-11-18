import type { EventoReporte, ImagemReporte, Reporte, ReporteListado, StatusReporte } from './reporte';

/** Persistência dos reportes, dos prints e do log de alterações. */
export interface RepositorioReportes {
  /**
   * Grava o reporte, os prints e o evento de criação numa única transação. O número sequencial é
   * atribuído no próprio INSERT, para dois usuários enviando ao mesmo tempo não colidirem.
   * @returns o número atribuído
   */
  criar(dados: { reporte: Omit<Reporte, 'numero'>; imagens: ImagemReporte[]; evento: EventoReporte }): Promise<number>;
  /** Mais recentes primeiro; filtra por status quando informado. */
  listar(filtro?: { status?: StatusReporte }): Promise<ReporteListado[]>;
  obter(id: string): Promise<Reporte | null>;
  listarImagens(reporteId: string): Promise<ImagemReporte[]>;
  obterImagem(imagemId: string): Promise<ImagemReporte | null>;
  /** Mais antigos primeiro. */
  listarEventos(reporteId: string): Promise<EventoReporte[]>;
  /** Grava o novo status (pode ser o mesmo, num comentário) e o evento numa única transação. */
  registrarAndamento(dados: { reporteId: string; status: StatusReporte; atualizadoEm: Date; evento: EventoReporte }): Promise<void>;
}
