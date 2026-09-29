export const MODELOS_IA = [
  'claude-opus-5',
  'claude-sonnet-5',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  // OpenRouter: só o roteador automático e modelos gratuitos (":free") que aceitam saída estruturada.
  'openrouter/free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'qwen/qwen3.8-27b:free',
  'nex-agi/nex-n2.5-pro:free',
  'dots-studio/dots-3-note-preview:free',
] as const;
export type ModeloIaDTO = (typeof MODELOS_IA)[number];

export const PROVEDORES_IA = ['anthropic', 'google', 'openrouter'] as const;
export type ProvedorIaDTO = (typeof PROVEDORES_IA)[number];

/** Cada provedor tem a sua chave: o modelo escolhido define qual delas é usada. */
export function provedorDoModelo(modelo: ModeloIaDTO): ProvedorIaDTO {
  if (modelo.startsWith('gemini')) return 'google';
  if (modelo.startsWith('claude')) return 'anthropic';
  return 'openrouter';
}

export interface EstadoIaDTO {
  /** Há chave salva para o provedor do modelo escolhido. */
  configurada: boolean;
  modelo: ModeloIaDTO;
  provedor: ProvedorIaDTO;
  /** Só os 4 últimos caracteres de cada chave salva, para o administrador reconhecê-la. */
  chaves: Record<ProvedorIaDTO, string | null>;
}

export interface ConfigurarIaEntrada {
  /** Chave do provedor do modelo escolhido. Ausente: mantém a chave já salva. */
  chave?: string;
  modelo: ModeloIaDTO;
}

export interface ItemDaChecklistDTO {
  texto: string;
  ativo: boolean;
}

/** O que a IA recebe como orientação, além do cronograma. */
export interface InstrucoesIaDTO {
  checklist: ItemDaChecklistDTO[];
  orientacoes: string;
  /** ISO; `null` enquanto só existe o padrão. */
  atualizadoEm: string | null;
  /** Parte fixa (no código), mostrada só para leitura. */
  instrucoesFixas: string;
}

export interface SalvarInstrucoesIaEntrada {
  checklist: ItemDaChecklistDTO[];
  orientacoes: string;
}

export type SaudeDoCronogramaDTO = 'no_prazo' | 'atencao' | 'critico';
export type GravidadeDTO = 'alta' | 'media' | 'baixa';

/** Visão macro de todos os cronogramas não arquivados (gestão de portfólio). */
export interface AnalisePortfolioDTO {
  /** Id no arquivo de análises: toda análise gerada fica salva. */
  id: string;
  geradaEm: string;
  geradaPor: string | null;
  modelo: string;
  quantidadeDeProjetos: number;
  saude: SaudeDoCronogramaDTO;
  resumo: string;
  projetos: { nome: string; saude: SaudeDoCronogramaDTO; comentario: string }[];
  conflitosDeRecursos: { responsavel: string; projetos: string[]; motivo: string }[];
  riscos: { titulo: string; detalhe: string; gravidade: GravidadeDTO; projetos: string[] }[];
  prioridades: { acao: string; justificativa: string; projetos: string[] }[];
}

export interface AnaliseCronogramaDTO {
  /** Id no arquivo de análises: toda análise gerada fica salva. */
  id: string;
  geradaEm: string;
  geradaPor: string | null;
  modelo: string;
  saude: SaudeDoCronogramaDTO;
  resumo: string;
  riscos: { titulo: string; detalhe: string; gravidade: GravidadeDTO; tarefas: string[] }[];
  gargalos: { responsavel: string; motivo: string }[];
  sugestoes: { acao: string; justificativa: string; tarefas: string[] }[];
}

/** Uma fala do chat: `usuario` pergunta, `ia` responde. */
export interface MensagemDoChatDTO {
  papel: 'usuario' | 'ia';
  texto: string;
}

/** Histórico da conversa (a última mensagem é a pergunta atual). O app não guarda conversas. */
export interface ConversarComIaEntrada {
  mensagens: MensagemDoChatDTO[];
}

export interface RespostaDoChatDTO {
  texto: string;
  /** Modelo que de fato respondeu (no roteador gratuito do OpenRouter, pode variar). */
  modelo: string;
}

/** Limites do chat, iguais no app e no processo principal. */
export const LIMITE_DE_MENSAGENS_DO_CHAT = 20;
export const LIMITE_DE_CARACTERES_DA_PERGUNTA = 2000;

/** Cada módulo do app tem a sua IA: instruções, modelo, análises e chat separados. */
export type EscopoIaDTO = 'projetos' | 'avs';

/** Visão de todas as AVs. O texto segue seções fixas (RESUMO, PONTOS DE ATENÇÃO, GARGALOS, PRÓXIMAS AÇÕES). */
export interface AnaliseAvsDTO {
  id: string;
  geradaEm: string;
  geradaPor: string | null;
  modelo: string;
  quantidadeDeAvs: number;
  /** Calculada pelos prazos das AVs (não pela IA). */
  saude: SaudeDoCronogramaDTO;
  texto: string;
}

export type TipoDeAnaliseDTO = 'cronograma' | 'portfolio' | 'avs';

/** Linha do arquivo de análises (sem o conteúdo). */
export interface ResumoDeAnaliseDTO {
  id: string;
  tipo: TipoDeAnaliseDTO;
  /** Na análise de portfólio é `null`. O cronograma pode ter sido excluído depois. */
  cronogramaId: string | null;
  /** Nome do cronograma na época da análise, ou "Portfólio". */
  titulo: string;
  modelo: string;
  saude: SaudeDoCronogramaDTO;
  geradaEm: string;
  geradaPor: string | null;
}

export type AnaliseArquivadaDTO =
  | (ResumoDeAnaliseDTO & { tipo: 'cronograma'; analise: AnaliseCronogramaDTO })
  | (ResumoDeAnaliseDTO & { tipo: 'portfolio'; analise: AnalisePortfolioDTO })
  | (ResumoDeAnaliseDTO & { tipo: 'avs'; analise: AnaliseAvsDTO });

/** `cronogramaId` nulo: última análise de portfólio. */
export interface UltimaAnaliseEntrada {
  cronogramaId: string | null;
}
