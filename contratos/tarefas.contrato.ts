export const SITUACOES_TAREFA = ['pendente', 'em_andamento', 'concluida'] as const;
export type SituacaoTarefaDTO = (typeof SITUACOES_TAREFA)[number];

export interface TarefaDTO {
  id: string;
  cronogramaId: string;
  faseId: string | null;
  titulo: string;
  descricao: string | null;
  /** Data no formato AAAA-MM-DD */
  dataInicio: string;
  /** Data no formato AAAA-MM-DD */
  dataFim: string;
  duracaoEmDias: number;
  percentualConcluido: number;
  situacao: SituacaoTarefaDTO;
  responsavelId: string | null;
  /** Ids das tarefas predecessoras (término → início). */
  dependencias: string[];
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarTarefaEntrada {
  cronogramaId: string;
  titulo: string;
  descricao?: string | null;
  dataInicio: string;
  dataFim: string;
  faseId?: string | null;
  responsavelId?: string | null;
}

export interface AtualizarTarefaEntrada {
  id: string;
  titulo?: string;
  descricao?: string | null;
  dataInicio?: string;
  dataFim?: string;
  percentualConcluido?: number;
  situacao?: SituacaoTarefaDTO;
  responsavelId?: string | null;
  dependencias?: string[];
}

/** Sucessoras que podem ser empurradas depois de um atraso; a UI pede confirmação. */
export interface ImpactoDeAtrasoDTO {
  diasDeAtraso: number;
  sucessoras: { id: string; titulo: string }[];
}

export interface AtualizarTarefaSaida {
  tarefa: TarefaDTO;
  impacto: ImpactoDeAtrasoDTO | null;
}

export interface DeslocarSucessorasEntrada {
  tarefaId: string;
  dias: number;
}

export interface CriarFaseEntrada {
  cronogramaId: string;
  nome: string;
  /** Subtarefas em branco criadas junto, para preenchimento direto na lista. */
  quantidadeDeSubtarefas: number;
}

export interface AtualizarFaseEntrada {
  id: string;
  nome: string;
}

export interface ReordenarTarefasEntrada {
  cronogramaId: string;
  ordens: { id: string; ordem: number }[];
}

/** Copia fases e tarefas de um cronograma para outro recém-criado (uso como modelo). */
export interface CopiarEstruturaEntrada {
  origemId: string;
  destinoId: string;
}

/** Tarefa de qualquer cronograma não arquivado, com os nomes prontos para os relatórios. */
export interface ItemAgendaDTO {
  tarefaId: string;
  titulo: string;
  cronogramaId: string;
  cronogramaNome: string;
  faseNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  dataInicio: string;
  dataFim: string;
  percentualConcluido: number;
}

/**
 * Linha da estrutura analítica (fases e tarefas já ordenadas, numeradas e com o
 * cálculo de folga/caminho crítico pronto).
 */
export interface LinhaEstruturaDTO {
  tipo: 'fase' | 'tarefa';
  id: string;
  /** Numeração WBS: "1", "1.1", "2"... */
  numero: string;
  nivel: number;
  faseId: string | null;
  titulo: string;
  descricao: string | null;
  /** Nas fases, é o resumo das subtarefas; `null` quando a fase está vazia. */
  dataInicio: string | null;
  dataFim: string | null;
  duracaoEmDias: number;
  percentualConcluido: number;
  situacao: SituacaoTarefaDTO | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  dependencias: string[];
  /** Números das predecessoras, para exibir na coluna Dependência. */
  dependenciasNumeros: string[];
  critico: boolean;
  folgaEmDias: number | null;
  /** true quando a tarefa começa antes do fim de alguma predecessora. */
  conflitoDeDependencia: boolean;
}

export interface EstruturaCronogramaDTO {
  cronogramaId: string;
  /** Janela do gráfico de Gantt: menor início e maior término entre as tarefas. */
  inicio: string;
  fim: string;
  linhas: LinhaEstruturaDTO[];
}
