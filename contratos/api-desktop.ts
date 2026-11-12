import type { AparenciaDTO } from './aparencia.contrato';
import type { EstadoApresentacaoDTO } from './apresentacao.contrato';
import type {
  AppAbertoDTO,
  EstadoDaAtualizacaoDTO,
  SolicitarFechamentoEntrada,
} from './atualizacao.contrato';
import type { CaixaDeNotificacoesDTO } from './notificacoes.contrato';
import type {
  AceitarSdEntrada,
  AnexoSdDTO,
  DevolverSdEntrada,
  SalvarSdEntrada,
  SdDTO,
} from './sds.contrato';
import type {
  AnexoAvDTO,
  AplicarAoGrupoEntrada,
  AplicarAoGrupoSaida,
  AtualizarComercialEntrada,
  AtualizarEquipeEntrada,
  AtualizarSecaoCustoEntrada,
  AtualizarSecaoPcpEntrada,
  AtualizarSecaoProcessoEntrada,
  AtualizarSecaoProdutoEntrada,
  AvDetalheDTO,
  AvResumoDTO,
  AvancarEtapaEntrada,
  CatalogoCustoDTO,
  ContatoAvDTO,
  ConteudoAnexoDTO,
  CriarAvEntrada,
  CriarGrupoAvEntrada,
  DashboardAvDTO,
  PrazosConfigDTO,
  DeclinarAvEntrada,
  GerarAvsExemploSaida,
  GrupoAvDTO,
  HistoricoAvItemDTO,
  LinhaRelatorioAvDTO,
  MembroAreaDTO,
  MeuPerfilAvDTO,
  PerfilAvDTO,
  SalvarContatosAvEntrada,
  SalvarPerfilAvEntrada,
  SecaoCustoDTO,
  SecaoPcpDTO,
  SecaoProcessoDTO,
  SecaoProdutoDTO,
  SelecionarEAnexarEntrada,
  TemplateAvDTO,
  TemplateAvEntrada,
  TipoTemplateAvDTO,
} from './avs.contrato';
import type {
  AtualizarCronogramaEntrada,
  CriarCronogramaEntrada,
  CronogramaDTO,
} from './cronogramas.contrato';
import type {
  AnaliseArquivadaDTO,
  AnaliseAvsDTO,
  AnaliseCronogramaDTO,
  AnalisePortfolioDTO,
  ConfigurarIaEntrada,
  ConversaDTO,
  ConversarComIaEntrada,
  EscopoIaDTO,
  EstadoIaDTO,
  InstrucoesIaDTO,
  PropostaDeAlteracaoDTO,
  RespostaDoChatDTO,
  ResumoDeAnaliseDTO,
  ResumoDeConversaDTO,
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
import type {
  ConcluirPrimeiroAcessoEntrada,
  EntrarEntrada,
  PrimeiroAcessoEntrada,
  SessaoDTO,
  UsuarioDTO,
  UsuarioOnlineDTO,
} from './sessao.contrato';
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
  /** Modo apresentação: dados fictícios em pasta própria; entrar/sair reinicia o app. */
  apresentacao: {
    obterEstado(): Promise<Resultado<EstadoApresentacaoDTO>>;
    entrar(): Promise<Resultado<null>>;
    sair(): Promise<Resultado<null>>;
  };
  /** Atualização do sistema: pedido de fechamento de todos os apps e a lista de apps abertos. */
  atualizacao: {
    obterEstado(): Promise<Resultado<EstadoDaAtualizacaoDTO>>;
    fecharAgora(): Promise<Resultado<null>>;
    solicitar(entrada: SolicitarFechamentoEntrada): Promise<Resultado<EstadoDaAtualizacaoDTO>>;
    cancelar(): Promise<Resultado<EstadoDaAtualizacaoDTO>>;
    listarAppsAbertos(): Promise<Resultado<AppAbertoDTO[]>>;
  };
  /** Sino da barra superior: só as notificações do usuário logado. */
  notificacoes: {
    obterCaixa(): Promise<Resultado<CaixaDeNotificacoesDTO>>;
    marcarLida(id: string): Promise<Resultado<CaixaDeNotificacoesDTO>>;
    marcarTodasLidas(): Promise<Resultado<CaixaDeNotificacoesDTO>>;
  };
  sessao: {
    obter(): Promise<Resultado<SessaoDTO>>;
    entrar(entrada: EntrarEntrada): Promise<Resultado<SessaoDTO>>;
    sair(): Promise<Resultado<SessaoDTO>>;
    /** Batimento periódico: avisa que esta instância do aplicativo continua aberta. */
    presenca(): Promise<Resultado<null>>;
    primeiroAcesso(entrada: PrimeiroAcessoEntrada): Promise<Resultado<SessaoDTO>>;
    /** Usuário criado sem senha: cadastra e-mail, cria a senha e entra. */
    concluirPrimeiroAcesso(entrada: ConcluirPrimeiroAcessoEntrada): Promise<Resultado<SessaoDTO>>;
  };
  usuarios: {
    listar(): Promise<Resultado<UsuarioDTO[]>>;
    listarOnline(): Promise<Resultado<UsuarioOnlineDTO[]>>;
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
  sds: {
    listar(): Promise<Resultado<SdDTO[]>>;
    /** `null` quando a AV ainda não gerou uma SD. */
    obterPorAv(avId: string): Promise<Resultado<SdDTO | null>>;
    obter(id: string): Promise<Resultado<SdDTO>>;
    /** Comercial: data de envio da cotação, nº do PO e observações. */
    salvar(entrada: SalvarSdEntrada): Promise<Resultado<SdDTO>>;
    /** Comercial entrega a SD para a Engenharia (exige data de envio e evidência). */
    abrir(id: string): Promise<Resultado<SdDTO>>;
    /** Gerente de Engenharia / Gestor de Programa: fecha a SD e cria o projeto PRO. */
    aceitar(entrada: AceitarSdEntrada): Promise<Resultado<SdDTO>>;
    devolver(entrada: DevolverSdEntrada): Promise<Resultado<SdDTO>>;
    listarEvidencias(sdId: string): Promise<Resultado<AnexoSdDTO[]>>;
    /** Abre o seletor de arquivos; `null` quando o usuário cancela. */
    anexarEvidencias(sdId: string): Promise<Resultado<AnexoSdDTO[] | null>>;
    /** Abre o arquivo no programa padrão (Outlook, leitor de PDF…). */
    abrirEvidencia(anexoId: string): Promise<Resultado<null>>;
    excluirEvidencia(anexoId: string): Promise<Resultado<null>>;
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
    /** Dias úteis de cada área da AV. */
    obterPrazosConfig(): Promise<Resultado<PrazosConfigDTO>>;
    /** Altera os dias úteis de cada área (administrador). */
    salvarPrazosConfig(entrada: PrazosConfigDTO): Promise<Resultado<PrazosConfigDTO>>;
    avancarEtapa(entrada: AvancarEtapaEntrada): Promise<Resultado<AvDetalheDTO>>;
    declinar(entrada: DeclinarAvEntrada): Promise<Resultado<AvDetalheDTO>>;
    listarHistorico(avId: string): Promise<Resultado<HistoricoAvItemDTO[]>>;
    obterCatalogoCusto(): Promise<Resultado<CatalogoCustoDTO>>;
    obterSecaoCusto(avId: string): Promise<Resultado<SecaoCustoDTO>>;
    salvarSecaoCusto(entrada: AtualizarSecaoCustoEntrada): Promise<Resultado<SecaoCustoDTO>>;
    obterSecaoProduto(avId: string): Promise<Resultado<SecaoProdutoDTO>>;
    salvarSecaoProduto(entrada: AtualizarSecaoProdutoEntrada): Promise<Resultado<SecaoProdutoDTO>>;
    obterSecaoProcesso(avId: string): Promise<Resultado<SecaoProcessoDTO>>;
    salvarSecaoProcesso(entrada: AtualizarSecaoProcessoEntrada): Promise<Resultado<SecaoProcessoDTO>>;
    /** Abre uma pasta (rede/local) no explorador de arquivos, ou uma URL no navegador padrão. */
    abrirCaminho(caminho: string): Promise<Resultado<null>>;
    /** Abre o seletor de arquivos do SO e devolve o caminho escolhido; `null` se o usuário cancelar. */
    selecionarCaminho(): Promise<Resultado<string | null>>;
    listarAnexos(avId: string): Promise<Resultado<AnexoAvDTO[]>>;
    /** Abre o seletor de arquivos do SO; devolve null se o usuário cancelar. */
    selecionarEAnexar(entrada: SelecionarEAnexarEntrada): Promise<Resultado<AnexoAvDTO[] | null>>;
    /** Lê o arquivo do disco e devolve o conteúdo em base64, para pré-visualização. */
    obterConteudoAnexo(anexoId: string): Promise<Resultado<ConteudoAnexoDTO>>;
    excluirAnexo(anexoId: string): Promise<Resultado<null>>;
    /** Cria 25 AVs de exemplo em estágios variados (só administrador; não duplica). */
    gerarExemplos(): Promise<Resultado<GerarAvsExemploSaida>>;
    listarTemplates(tipo: TipoTemplateAvDTO): Promise<Resultado<TemplateAvDTO[]>>;
    /** Salva a sequência como template; se já existir um com o mesmo nome e tipo, ele é substituído. */
    salvarTemplate(entrada: TemplateAvEntrada): Promise<Resultado<TemplateAvDTO>>;
    excluirTemplate(id: string): Promise<Resultado<null>>;
    /** Encerra a análise e cria a Pré-SD (mesmo número da AV); a AV passa para "SD Aberta". */
    finalizarECriarPreSd(avId: string): Promise<Resultado<SdDTO>>;
    listarGrupos(): Promise<Resultado<GrupoAvDTO[]>>;
    /** Cria o grupo com N AVs novas; devolve o grupo com as AVs em ordem de número. */
    criarGrupo(entrada: CriarGrupoAvEntrada): Promise<Resultado<GrupoAvDTO>>;
    /** Uma linha por AV, com etapa, prazo, atraso e valores consolidados (base dos relatórios das AVs). */
    relatorio(): Promise<Resultado<LinhaRelatorioAvDTO[]>>;
    obterSecaoPcp(avId: string): Promise<Resultado<SecaoPcpDTO>>;
    salvarSecaoPcp(entrada: AtualizarSecaoPcpEntrada): Promise<Resultado<SecaoPcpDTO>>;
    obterContatos(avId: string): Promise<Resultado<ContatoAvDTO[]>>;
    salvarContatos(entrada: SalvarContatosAvEntrada): Promise<Resultado<ContatoAvDTO[]>>;
    /** Competências e papéis especiais de cada usuário ativo (administrador). */
    listarPerfis(): Promise<Resultado<PerfilAvDTO[]>>;
    salvarPerfil(entrada: SalvarPerfilAvEntrada): Promise<Resultado<PerfilAvDTO>>;
    /** O que o usuário logado pode fazer no fluxo AV/SD. */
    obterMeuPerfil(): Promise<Resultado<MeuPerfilAvDTO>>;
    /** Copia da AV informada para as demais do grupo (só os campos preenchidos). */
    aplicarAoGrupo(entrada: AplicarAoGrupoEntrada): Promise<Resultado<AplicarAoGrupoSaida>>;
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
    /** IA do módulo de AVs: modelo, instruções, análise e chat próprios (as chaves de API são as mesmas). */
    estadoAvs(): Promise<Resultado<EstadoIaDTO>>;
    configurarAvs(entrada: ConfigurarIaEntrada): Promise<Resultado<EstadoIaDTO>>;
    removerChaveAvs(): Promise<Resultado<EstadoIaDTO>>;
    /** Envia o retrato das AVs à IA e devolve a análise (fica no arquivo). Não altera nenhum dado. */
    analisarAvs(): Promise<Resultado<AnaliseAvsDTO>>;
    /** A análise de AVs mais recente; `null` se ainda não houver. */
    ultimaAnaliseAvs(): Promise<Resultado<AnaliseAvsDTO | null>>;
    conversarAvs(entrada: ConversarComIaEntrada): Promise<Resultado<RespostaDoChatDTO>>;
    /** Histórico do chat do usuário logado, por escopo (mais recentes primeiro). */
    listarConversas(escopo: EscopoIaDTO): Promise<Resultado<ResumoDeConversaDTO[]>>;
    obterConversa(id: string): Promise<Resultado<ConversaDTO>>;
    excluirConversa(id: string): Promise<Resultado<null>>;
    /** Agente do chat de Projetos: aplica (ou descarta) a proposta de alterações. */
    aplicarProposta(id: string): Promise<Resultado<PropostaDeAlteracaoDTO>>;
    descartarProposta(id: string): Promise<Resultado<PropostaDeAlteracaoDTO>>;
    obterInstrucoesAvs(): Promise<Resultado<InstrucoesIaDTO>>;
    salvarInstrucoesAvs(entrada: SalvarInstrucoesIaEntrada): Promise<Resultado<InstrucoesIaDTO>>;
    restaurarChecklistAvs(): Promise<Resultado<InstrucoesIaDTO>>;
  };
  preferencias: {
    obter(): Promise<Resultado<PreferenciasDTO>>;
    definirTema(tema: TemaDTO): Promise<Resultado<PreferenciasDTO>>;
  };
  aparencia: AparenciaDTO;
}
