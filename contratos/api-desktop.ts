import type { AparenciaDTO } from './aparencia.contrato';
import type {
  AtualizarComercialEntrada,
  AtualizarEquipeEntrada,
  AvancarEtapaEntrada,
  AvDetalheDTO,
  AvResumoDTO,
  CriarAvEntrada,
  DashboardAvDTO,
  DeclinarAvEntrada,
  HistoricoAvItemDTO,
  MembroAreaDTO,
} from './avs.contrato';
import type {
  AtualizarCronogramaEntrada,
  CriarCronogramaEntrada,
  CronogramaDTO,
} from './cronogramas.contrato';
import type {
  AnaliseArquivadaDTO,
  AnaliseCronogramaDTO,
  AnalisePortfolioDTO,
  ConfigurarIaEntrada,
  ConversarComIaEntrada,
  EstadoIaDTO,
  InstrucoesIaDTO,
  RespostaDoChatDTO,
  ResumoDeAnaliseDTO,
  SalvarInstrucoesIaEntrada,
  UltimaAnaliseEntrada,
} from './ia.contrato';
import type { ExportacaoPdfDTO } from './impressao.contrato';
import type { PreferenciasDTO, TemaDTO } from './preferencias.contrato';
import type {
  AtualizarResponsavelEntrada,
  CriarResponsavelEntrada,
  ResponsavelDTO,
} from './responsaveis.contrato';
import type { Resultado } from './resultado';
import type { EntrarEntrada, PrimeiroAcessoEntrada, SessaoDTO, UsuarioDTO } from './sessao.contrato';
import type {
  AtualizarFaseEntrada,
  AtualizarTarefaEntrada,
  AtualizarTarefaSaida,
  CopiarEstruturaEntrada,
  CriarFaseEntrada,
  CriarTarefaEntrada,
  DeslocarSucessorasEntrada,
  AjustarDatasDaFaseEntrada,
  EstruturaCronogramaDTO,
  ItemAgendaDTO,
  ReordenarTarefasEntrada,
  TarefaDTO,
} from './tarefas.contrato';
import type {
  AlterarSenhaEntrada,
  AtualizarUsuarioEntrada,
  CriarUsuarioEntrada,
} from './usuarios.contrato';

/** Formato de `window.api`, exposto pelo preload via contextBridge. */
export interface ApiDesktop {
  sessao: {
    obter(): Promise<Resultado<SessaoDTO>>;
    entrar(entrada: EntrarEntrada): Promise<Resultado<SessaoDTO>>;
    sair(): Promise<Resultado<SessaoDTO>>;
    primeiroAcesso(entrada: PrimeiroAcessoEntrada): Promise<Resultado<SessaoDTO>>;
  };
  usuarios: {
    listar(): Promise<Resultado<UsuarioDTO[]>>;
    criar(entrada: CriarUsuarioEntrada): Promise<Resultado<UsuarioDTO>>;
    atualizar(entrada: AtualizarUsuarioEntrada): Promise<Resultado<UsuarioDTO>>;
    alterarSenha(entrada: AlterarSenhaEntrada): Promise<Resultado<null>>;
    excluir(id: string): Promise<Resultado<null>>;
  };
  responsaveis: {
    listar(): Promise<Resultado<ResponsavelDTO[]>>;
    criar(entrada: CriarResponsavelEntrada): Promise<Resultado<ResponsavelDTO>>;
    atualizar(entrada: AtualizarResponsavelEntrada): Promise<Resultado<ResponsavelDTO>>;
    excluir(id: string): Promise<Resultado<null>>;
  };
  avs: {
    listar(): Promise<Resultado<AvResumoDTO[]>>;
    obter(id: string): Promise<Resultado<AvDetalheDTO>>;
    criar(entrada: CriarAvEntrada): Promise<Resultado<AvDetalheDTO>>;
    atualizarComercial(entrada: AtualizarComercialEntrada): Promise<Resultado<AvDetalheDTO>>;
    atualizarEquipe(entrada: AtualizarEquipeEntrada): Promise<Resultado<AvDetalheDTO>>;
    /** Lista simples (id + nome) para preencher os seletores de responsável por área. */
    listarMembros(): Promise<Resultado<MembroAreaDTO[]>>;
    obterDashboard(): Promise<Resultado<DashboardAvDTO>>;
    avancarEtapa(entrada: AvancarEtapaEntrada): Promise<Resultado<AvDetalheDTO>>;
    declinar(entrada: DeclinarAvEntrada): Promise<Resultado<AvDetalheDTO>>;
    listarHistorico(avId: string): Promise<Resultado<HistoricoAvItemDTO[]>>;
  };
  cronogramas: {
    listar(): Promise<Resultado<CronogramaDTO[]>>;
    obter(id: string): Promise<Resultado<CronogramaDTO>>;
    criar(entrada: CriarCronogramaEntrada): Promise<Resultado<CronogramaDTO>>;
    atualizar(entrada: AtualizarCronogramaEntrada): Promise<Resultado<CronogramaDTO>>;
    excluir(id: string): Promise<Resultado<null>>;
  };
  tarefas: {
    obterEstrutura(cronogramaId: string): Promise<Resultado<EstruturaCronogramaDTO>>;
    criar(entrada: CriarTarefaEntrada): Promise<Resultado<TarefaDTO>>;
    atualizar(entrada: AtualizarTarefaEntrada): Promise<Resultado<AtualizarTarefaSaida>>;
    excluir(id: string): Promise<Resultado<null>>;
    deslocarSucessoras(entrada: DeslocarSucessorasEntrada): Promise<Resultado<null>>;
    /** Devolve quantas tarefas da fase foram ajustadas. */
    ajustarDatasDaFase(entrada: AjustarDatasDaFaseEntrada): Promise<Resultado<number>>;
    criarFase(entrada: CriarFaseEntrada): Promise<Resultado<null>>;
    atualizarFase(entrada: AtualizarFaseEntrada): Promise<Resultado<null>>;
    excluirFase(id: string): Promise<Resultado<null>>;
    reordenar(entrada: ReordenarTarefasEntrada): Promise<Resultado<null>>;
    duplicar(id: string): Promise<Resultado<TarefaDTO>>;
    copiarEstrutura(entrada: CopiarEstruturaEntrada): Promise<Resultado<null>>;
    listarAgenda(): Promise<Resultado<ItemAgendaDTO[]>>;
  };
  impressao: {
    /** Pergunta onde salvar, gera o PDF (dashboard + lista de atividades) e o abre. */
    exportarPdf(cronogramaId: string): Promise<Resultado<ExportacaoPdfDTO | null>>;
    /** PDF de uma análise do arquivo. */
    exportarAnalisePdf(analiseId: string): Promise<Resultado<ExportacaoPdfDTO | null>>;
  };
  ia: {
    estado(): Promise<Resultado<EstadoIaDTO>>;
    /** Só administrador. Testa a chave na API antes de salvar. */
    configurar(entrada: ConfigurarIaEntrada): Promise<Resultado<EstadoIaDTO>>;
    removerChave(): Promise<Resultado<EstadoIaDTO>>;
    /** Envia o cronograma à Claude API e devolve o relatório. Não altera nenhum dado. */
    analisar(cronogramaId: string): Promise<Resultado<AnaliseCronogramaDTO>>;
    /** Visão macro de todos os cronogramas não arquivados. Não altera nenhum dado. */
    analisarPortfolio(): Promise<Resultado<AnalisePortfolioDTO>>;
    /** Chat: responde perguntas sobre todos os cronogramas em andamento. Só lê, não altera nada. */
    conversar(entrada: ConversarComIaEntrada): Promise<Resultado<RespostaDoChatDTO>>;
    /** Arquivo de análises: toda análise gerada fica salva, da mais nova para a mais antiga. */
    listarAnalises(): Promise<Resultado<ResumoDeAnaliseDTO[]>>;
    obterAnalise(id: string): Promise<Resultado<AnaliseArquivadaDTO>>;
    /** A mais recente do cronograma (ou do portfólio); `null` se ainda não houver. */
    ultimaAnalise(entrada: UltimaAnaliseEntrada): Promise<Resultado<AnaliseArquivadaDTO | null>>;
    /** Administrador e gestor. */
    excluirAnalise(id: string): Promise<Resultado<null>>;
    /** Administrador e gestor: checklist e orientações que a IA recebe. */
    obterInstrucoes(): Promise<Resultado<InstrucoesIaDTO>>;
    salvarInstrucoes(entrada: SalvarInstrucoesIaEntrada): Promise<Resultado<InstrucoesIaDTO>>;
    restaurarChecklist(): Promise<Resultado<InstrucoesIaDTO>>;
  };
  preferencias: {
    obter(): Promise<Resultado<PreferenciasDTO>>;
    definirTema(tema: TemaDTO): Promise<Resultado<PreferenciasDTO>>;
  };
  aparencia: AparenciaDTO;
}
