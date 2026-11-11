export const SITUACOES_CRONOGRAMA = ['planejado', 'em_andamento', 'concluido', 'arquivado'] as const;
export type SituacaoCronogramaDTO = (typeof SITUACOES_CRONOGRAMA)[number];

export interface CronogramaDTO {
  id: string;
  nome: string;
  descricao: string | null;
  /** Data no formato AAAA-MM-DD */
  dataInicio: string;
  /** Data no formato AAAA-MM-DD */
  dataFim: string;
  duracaoEmDias: number;
  situacao: SituacaoCronogramaDTO;
  /** Código do projeto (`PRO 26-001`) quando nasceu do aceite de uma SD; `null` nos criados à mão. */
  codigo: string | null;
  /** Criado antes do uso multiusuário: aba Histórico e fora dos contadores; segue editável. */
  historico: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarCronogramaEntrada {
  nome: string;
  descricao?: string | null;
  dataInicio: string;
  dataFim: string;
}

export interface AtualizarCronogramaEntrada {
  id: string;
  nome?: string;
  descricao?: string | null;
  dataInicio?: string;
  dataFim?: string;
  situacao?: SituacaoCronogramaDTO;
}
