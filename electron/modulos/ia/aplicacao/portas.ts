import type {
  AplicarAlteracoesEntrada,
  EstadoEsperadoDaTarefaDTO,
  OperacaoDeCronogramaDTO,
} from '@contratos/tarefas.contrato';
import type { LinhaRelatorioAvDTO } from '@contratos/avs.contrato';
import type {
  AnaliseArquivadaDTO,
  EscopoIaDTO,
  ItemDaPropostaDTO,
  SituacaoDaPropostaDTO,
  AnaliseCronogramaDTO,
  AnalisePortfolioDTO,
  MensagemDoChatDTO,
  ModeloIaDTO,
  ProvedorIaDTO,
  ResumoDeAnaliseDTO,
  TipoDeAnaliseDTO,
} from '@contratos/ia.contrato';
import type { EstruturaCronogramaDTO } from '@contratos/tarefas.contrato';
import type { ContextoDaAnalise } from './contexto-da-analise';
import type { ContextoDasAvs } from './contexto-das-avs';
import type { ContextoDoChat } from './contexto-do-chat';
import type { ContextoDoPortfolio } from './contexto-do-portfolio';
import type { ItemDaChecklist } from './instrucoes';

// A infraestrutura só enxerga os contratos através da aplicação.
export { MODELOS_IA, PROVEDORES_IA, provedorDoModelo } from '@contratos/ia.contrato';
export type {
  AnaliseArquivadaDTO,
  EscopoIaDTO,
  ModeloIaDTO,
  ProvedorIaDTO,
  ResumoDeAnaliseDTO,
  TipoDeAnaliseDTO,
} from '@contratos/ia.contrato';

/** Campos que o caso de uso preenche; o modelo devolve só o conteúdo. */
type CamposDoArquivo = 'id' | 'geradaEm' | 'geradaPor' | 'modelo';

export type ResultadoDoModelo = Omit<AnaliseCronogramaDTO, CamposDoArquivo> & {
  /** Modelo que de fato respondeu (pode ser o de fallback). */
  modelo: string;
};

export interface PedidoDeAnalise {
  chave: string;
  modelo: ModeloIaDTO;
  /** Instruções completas: parte fixa + checklist e orientações da equipe. */
  instrucoes: string;
  contexto: ContextoDaAnalise;
}

export type ResultadoDoPortfolio = Omit<AnalisePortfolioDTO, CamposDoArquivo | 'quantidadeDeProjetos'> & {
  modelo: string;
};

export interface PedidoDeAnalisePortfolio {
  chave: string;
  modelo: ModeloIaDTO;
  instrucoes: string;
  contexto: ContextoDoPortfolio;
}

export interface PedidoDeConversa {
  chave: string;
  modelo: ModeloIaDTO;
  instrucoes: string;
  /** Dados de todos os cronogramas em andamento; vão junto das instruções, a cada pergunta. */
  contexto: ContextoDoChat | ContextoDasAvs;
  /** Como chamar os dados no prompt ("Dados dos projetos (JSON)" por padrão). */
  rotuloDosDados?: string;
  /** Histórico começando e terminando numa fala do usuário, alternando com as da IA. */
  mensagens: MensagemDoChatDTO[];
  /** Ferramentas do agente (chat de Projetos, para quem pode editar tarefas). Sem elas, só conversa. */
  ferramentas?: FerramentaDoChat[];
}

/**
 * Ferramenta que a IA pode chamar durante a resposta. Roda no processo principal; o resultado volta para a
 * IA como texto. `erro: true` avisa a IA de que a chamada falhou (ela pode corrigir e tentar de novo).
 */
export interface FerramentaDoChat {
  nome: string;
  descricao: string;
  /** JSON Schema da entrada (o conteúdo é validado de novo em `executar`). */
  esquema: Record<string, unknown>;
  executar(entrada: unknown): Promise<{ conteudo: string; erro?: boolean }>;
}

export interface ResultadoDaConversa {
  texto: string;
  /** Modelo que de fato respondeu (pode ser o de fallback). */
  modelo: string;
}

/** A IA propriamente dita: recebe os dados resumidos e devolve o relatório estruturado. */
export interface ModeloDeAnalise {
  analisar(pedido: PedidoDeAnalise): Promise<ResultadoDoModelo>;
  analisarPortfolio(pedido: PedidoDeAnalisePortfolio): Promise<ResultadoDoPortfolio>;
  /** Responde a última pergunta do histórico, em texto livre, com base no contexto. */
  conversar(pedido: PedidoDeConversa): Promise<ResultadoDaConversa>;
  /** Confere se a chave é aceita e tem acesso ao modelo. Lança `ErroNaIa` se não. */
  testar(chave: string, modelo: ModeloIaDTO): Promise<void>;
}

/** Guarda as chaves das APIs cifradas, uma por provedor. Só o processo principal as vê. */
export interface CofreDeChave {
  obter(provedor: ProvedorIaDTO): Promise<string | null>;
  salvar(provedor: ProvedorIaDTO, chave: string): Promise<void>;
  remover(provedor: ProvedorIaDTO): Promise<void>;
}

export interface RepositorioDeConfiguracaoIa {
  obterModelo(escopo?: EscopoIaDTO): Promise<ModeloIaDTO | null>;
  salvarModelo(modelo: ModeloIaDTO, escopo?: EscopoIaDTO): Promise<void>;
}

export interface InstrucoesSalvas {
  checklist: ItemDaChecklist[];
  orientacoes: string;
  atualizadoEm: Date;
}

/** Checklist e orientações que a equipe edita no app. `null` antes da primeira gravação. */
export interface RepositorioDeInstrucoesIa {
  obterInstrucoes(escopo?: EscopoIaDTO): Promise<InstrucoesSalvas | null>;
  salvarInstrucoes(instrucoes: InstrucoesSalvas, escopo?: EscopoIaDTO): Promise<void>;
}

export interface ResumoDoCronograma {
  nome: string;
  situacao: string;
  dataInicio: string;
  dataFim: string;
  descricao: string | null;
  /** Código do projeto (PRO 26-001), quando nasceu de uma SD. */
  codigo?: string | null;
}

/** Portas para os módulos Cronogramas e Tarefas, ligadas na raiz de composição. */
export interface ConsultaDeCronograma {
  obterResumo(cronogramaId: string): Promise<ResumoDoCronograma | null>;
  /** Cronogramas que entram na visão de portfólio (os não arquivados). */
  listarIdsAtivos(): Promise<string[]>;
}

export interface ConsultaDeEstrutura {
  obterEstrutura(cronogramaId: string): Promise<EstruturaCronogramaDTO>;
}

/** Arquivo de análises: toda análise gerada fica salva para ser consultada sem chamar a IA de novo. */
export interface RepositorioDeAnalises {
  salvar(analise: AnaliseArquivadaDTO): Promise<void>;
  /** Da mais nova para a mais antiga, sem o conteúdo. */
  listar(): Promise<ResumoDeAnaliseDTO[]>;
  obter(id: string): Promise<AnaliseArquivadaDTO | null>;
  /** A mais recente do tipo; na de cronograma, filtra pelo `cronogramaId`. */
  ultima(tipo: TipoDeAnaliseDTO, cronogramaId: string | null): Promise<AnaliseArquivadaDTO | null>;
  /** `false` se não existia. */
  excluir(id: string): Promise<boolean>;
}

/** Quem está conversando com a IA (montado na raiz a partir dos módulos de usuários, AVs e recursos). */
export interface PerfilDeQuemConversa {
  id: string;
  nome: string;
  departamento: string | null;
  perfil: string;
  /** Papéis e competências no fluxo AV/SD, já por extenso (ex.: "Gestor de Programa", "competência Comercial"). */
  papeis: string[];
  /** Nome do recurso vinculado: é como a pessoa aparece como responsável nas tarefas. */
  nomeDoRecurso: string | null;
}

/** Porta para o módulo Usuários: registra quem gerou cada análise e identifica quem conversa no chat. */
export interface QuemEstaUsando {
  nomeDoUsuarioAtual(): string | null;
  /** Perfil completo de quem está logado; `null` sem sessão. */
  perfilDoUsuarioAtual?(): Promise<PerfilDeQuemConversa | null>;
}

/** Conversa guardada do Chat com IA. */
export interface ConversaGuardada {
  id: string;
  usuarioId: string;
  escopo: 'projetos' | 'avs';
  titulo: string;
  criadaEm: Date;
  atualizadaEm: Date;
}

export interface MensagemGuardada {
  papel: 'usuario' | 'ia';
  texto: string;
  modelo: string | null;
  /** Proposta do agente trazida por esta fala da IA. */
  propostaId?: string | null;
}

/** Proposta do agente, guardada até a pessoa decidir (e depois, para o histórico). */
export interface PropostaGuardada {
  id: string;
  usuarioId: string;
  cronogramaId: string;
  cronogramaNome: string;
  resumo: string;
  operacoes: OperacaoDeCronogramaDTO[];
  esperado: EstadoEsperadoDaTarefaDTO[];
  itens: ItemDaPropostaDTO[];
  situacao: SituacaoDaPropostaDTO;
  criadaEm: Date;
  decididaEm: Date | null;
  motivo: string | null;
}

export interface RepositorioDePropostas {
  salvar(proposta: PropostaGuardada): Promise<void>;
  /** `null` se não existe ou é de outro usuário. */
  obter(id: string, usuarioId: string): Promise<PropostaGuardada | null>;
  /** Para montar o histórico: as propostas de um usuário, por id. */
  obterVarias(ids: string[], usuarioId: string): Promise<Map<string, PropostaGuardada>>;
  /** Apaga as propostas que nenhuma fala guardada cita mais, criadas antes da data. */
  apagarSoltasDesde(limite: Date): Promise<number>;
}

/** Porta para o módulo Tarefas: aplica um lote de alterações numa transação (mesmas regras da tela). */
export interface EditorDeCronogramas {
  aplicarAlteracoes(entrada: AplicarAlteracoesEntrada): Promise<number>;
}

/** Resultado da validação de uma entrada vinda do modelo. */
export type LeituraDaEntrada<T> = { ok: true; dados: T } | { ok: false; erro: string };

/**
 * Esquemas das ferramentas do agente: o JSON Schema enviado à API e a validação da entrada recebida (a
 * entrada vem do modelo e é conferida de novo antes de usar). Implementado na infraestrutura (zod).
 */
export interface EsquemasDoAgente {
  verCronograma: {
    jsonSchema: Record<string, unknown>;
    ler(entrada: unknown): LeituraDaEntrada<{ projeto: string }>;
  };
  proporAlteracoes: {
    jsonSchema: Record<string, unknown>;
    ler(entrada: unknown): LeituraDaEntrada<{ projetoId: string; resumo: string; alteracoes: OperacaoDeCronogramaDTO[] }>;
  };
}

/** Porta para o módulo Recursos: quem pode ser responsável por uma tarefa. */
export interface ConsultaDeRecursos {
  listar(): Promise<{ id: string; nome: string; funcao: string | null }[]>;
}

/** Porta para a sessão: o agente só propõe (e só aplica) para quem pode editar tarefas. */
export interface PermissoesDeQuemUsa {
  podeEditarTarefas(): boolean;
}

/** Histórico do chat: cada usuário só enxerga as próprias conversas. */
export interface RepositorioDeConversas {
  criar(conversa: ConversaGuardada): Promise<void>;
  /** Acrescenta as falas ao fim da conversa e atualiza a data de uso. */
  acrescentar(conversaId: string, mensagens: MensagemGuardada[], agora: Date): Promise<void>;
  /** Mais recentes primeiro. */
  listar(usuarioId: string, escopo: 'projetos' | 'avs'): Promise<ConversaGuardada[]>;
  /** `null` se não existe ou é de outro usuário. */
  obter(id: string, usuarioId: string): Promise<(ConversaGuardada & { mensagens: MensagemGuardada[] }) | null>;
  /** `false` se não existia ou é de outro usuário. */
  excluir(id: string, usuarioId: string): Promise<boolean>;
  /** Apaga as conversas sem uso desde a data; devolve quantas. */
  apagarSemUsoDesde(limite: Date): Promise<number>;
}

/** Porta para o módulo AVs: uma linha por AV, com etapa, prazo, atraso e valores consolidados. */
export interface ConsultaDeAvs {
  relatorio(): Promise<LinhaRelatorioAvDTO[]>;
}
