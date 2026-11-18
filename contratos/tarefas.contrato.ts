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
  evidencia: string | null;
  /** Data (AAAA-MM-DD) em que a tarefa foi de fato concluída; `null` enquanto não registrada. */
  dataEfetiva: string | null;
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
  /** Insere logo abaixo desta tarefa (herda a fase dela), descendo as seguintes — "inserir linha" do Word. */
  inserirApos?: string | null;
  /** Com `faseId`: insere como primeira tarefa da fase. */
  inserirNoInicio?: boolean;
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
  /** Texto vazio ou `null` apaga a evidência. */
  evidencia?: string | null;
  /** `null` apaga a data efetiva. */
  dataEfetiva?: string | null;
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

/** Dá a todas as tarefas da fase o mesmo início e término (o ajuste fino é feito depois, à mão). */
export interface AjustarDatasDaFaseEntrada {
  faseId: string;
  dataInicio: string;
  dataFim: string;
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
  /** Sempre `null` nas fases. */
  evidencia: string | null;
  /** Data em que a tarefa foi de fato concluída; sempre `null` nas fases. */
  dataEfetiva: string | null;
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

// -----------------------------------------------------------------------------------------------------
// Alterações em lote (propostas pelo agente do Chat com IA e aplicadas só quando a pessoa confirma)
// -----------------------------------------------------------------------------------------------------

/** Uma alteração no cronograma. Os ids vêm da estrutura (nunca do número WBS, que muda). */
export type OperacaoDeCronogramaDTO =
  /** Dar baixa: 100 %, concluída, com a data em que terminou de fato (hoje, se não informada). */
  | { tipo: 'concluir_tarefa'; tarefaId: string; dataEfetiva: string | null; evidencia: string | null }
  | { tipo: 'atualizar_progresso'; tarefaId: string; percentual: number }
  | { tipo: 'ajustar_datas'; tarefaId: string; dataInicio: string; dataFim: string }
  /** Nova tarefa numa fase (no fim dela) ou logo abaixo de `inserirApos` (herdando a fase dessa tarefa). */
  | {
      tipo: 'criar_tarefa';
      faseId: string | null;
      inserirApos: string | null;
      titulo: string;
      dataInicio: string;
      dataFim: string;
      responsavelId: string | null;
    }
  /** Reordena as tarefas de uma fase pela data de início (e de término, no empate). */
  | { tipo: 'ordenar_fase_por_data'; faseId: string };

/** Como a tarefa estava quando a proposta foi feita: se mudou, a proposta não é aplicada. */
export interface EstadoEsperadoDaTarefaDTO {
  tarefaId: string;
  titulo: string;
  faseId: string | null;
  dataInicio: string;
  dataFim: string;
  percentualConcluido: number;
  situacao: SituacaoTarefaDTO;
}

export interface AplicarAlteracoesEntrada {
  cronogramaId: string;
  operacoes: OperacaoDeCronogramaDTO[];
  esperado: EstadoEsperadoDaTarefaDTO[];
}
