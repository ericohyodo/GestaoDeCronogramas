import type { LinhaRelatorioAvDTO } from '@contratos/avs.contrato';
import type {
  AnaliseArquivadaDTO,
  EscopoIaDTO,
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

/** Porta para o módulo Usuários: registra quem gerou cada análise. */
export interface QuemEstaUsando {
  nomeDoUsuarioAtual(): string | null;
}

/** Porta para o módulo AVs: uma linha por AV, com etapa, prazo, atraso e valores consolidados. */
export interface ConsultaDeAvs {
  relatorio(): Promise<LinhaRelatorioAvDTO[]>;
}
