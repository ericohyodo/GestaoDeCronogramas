/**
 * API pública do módulo AVs (Análises de Viabilidade).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import { transacional } from '../../nucleo/aplicacao/caso-de-uso';
import { type Notificador, semNotificacao } from '../../nucleo/aplicacao/portas/notificador';
import { ControleDeVersaoSqlite } from '../../nucleo/infraestrutura/banco/controle-de-versao-sqlite';
import { UnidadeDeTrabalhoSqlite } from '../../nucleo/infraestrutura/banco/unidade-de-trabalho-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { AbrirCaminho } from './aplicacao/casos-de-uso/abrir-caminho';
import { AtualizarComercial } from './aplicacao/casos-de-uso/atualizar-comercial';
import { AtualizarEquipe } from './aplicacao/casos-de-uso/atualizar-equipe';
import { AvancarEtapa } from './aplicacao/casos-de-uso/avancar-etapa';
import { CriarAv } from './aplicacao/casos-de-uso/criar-av';
import { ObterContatosAv, SalvarContatosAv } from './aplicacao/casos-de-uso/contatos-av';
import { DeclinarAv } from './aplicacao/casos-de-uso/declinar-av';
import { ExcluirAnexo } from './aplicacao/casos-de-uso/excluir-anexo';
import {
  AplicarAoGrupo,
  CriarGrupoDeAvs,
  ListarGruposAv,
} from './aplicacao/casos-de-uso/grupos-av';
import { FinalizarECriarPreSd } from './aplicacao/casos-de-uso/finalizar-e-criar-pre-sd';
import { GerarAvsExemplo } from './aplicacao/casos-de-uso/gerar-avs-exemplo';
import { type AvancarSdDeVitrine, GerarAvVitrine } from './aplicacao/casos-de-uso/gerar-av-vitrine';
import { ListarAnexos } from './aplicacao/casos-de-uso/listar-anexos';
import { ListarAvs } from './aplicacao/casos-de-uso/listar-avs';
import { ListarHistoricoAv } from './aplicacao/casos-de-uso/listar-historico';
import { ListarMembros } from './aplicacao/casos-de-uso/listar-membros';
import { ObterAv } from './aplicacao/casos-de-uso/obter-av';
import { ObterCatalogoCusto } from './aplicacao/casos-de-uso/obter-catalogo-custo';
import { ObterConteudoAnexo } from './aplicacao/casos-de-uso/obter-conteudo-anexo';
import { ObterDashboard } from './aplicacao/casos-de-uso/obter-dashboard';
import { ObterSecaoCusto } from './aplicacao/casos-de-uso/obter-secao-custo';
import { ObterSecaoProcesso } from './aplicacao/casos-de-uso/obter-secao-processo';
import { ObterSecaoProduto } from './aplicacao/casos-de-uso/obter-secao-produto';
import { ObterRelatorioAvs } from './aplicacao/casos-de-uso/obter-relatorio-avs';
import { ObterSecaoPcp, SalvarSecaoPcp } from './aplicacao/casos-de-uso/secao-pcp';
import { ListarPerfisAv, ObterMeuPerfilAv, SalvarPerfilAv } from './aplicacao/casos-de-uso/perfis-av';
import { ConcluirAvComProjeto, type ConcluirComProjetoEntrada } from './aplicacao/casos-de-uso/concluir-com-projeto';
import { VerificarPrazosDoCliente } from './aplicacao/casos-de-uso/verificar-prazos-do-cliente';
import { podeDarAceiteDaSd } from './dominio/papel-av';
import { ROTULO_DA_AREA } from './aplicacao/notificacoes-av';
import { SalvarSecaoCusto } from './aplicacao/casos-de-uso/salvar-secao-custo';
import { SalvarSecaoProcesso } from './aplicacao/casos-de-uso/salvar-secao-processo';
import { SalvarSecaoProduto } from './aplicacao/casos-de-uso/salvar-secao-produto';
import { SelecionarCaminho } from './aplicacao/casos-de-uso/selecionar-caminho';
import { SelecionarEAnexar } from './aplicacao/casos-de-uso/selecionar-e-anexar';
import { ExcluirTemplateAv, ListarTemplatesAv, SalvarTemplateAv } from './aplicacao/casos-de-uso/templates-av';
import { AutorizacaoAv } from './aplicacao/autorizacao';
import type { ConsultaDeUsuarios, CriadorDePreSd } from './aplicacao/portas';
import { registrarIpcAvs } from './apresentacao/controlador-ipc-avs';
import { AbridorDeCaminhoElectron } from './infraestrutura/abridor-de-caminho-electron';
import { ArmazenamentoDeArquivosFs } from './infraestrutura/armazenamento-de-arquivos-fs';
import { RepositorioAnexosSqlite } from './infraestrutura/repositorio-anexos-sqlite';
import { RepositorioAvsSqlite } from './infraestrutura/repositorio-avs-sqlite';
import { RepositorioCatalogoCustoSqlite } from './infraestrutura/repositorio-catalogo-custo-sqlite';
import { RepositorioContatosAvSqlite } from './infraestrutura/repositorio-contatos-av-sqlite';
import { RepositorioGruposAvSqlite } from './infraestrutura/repositorio-grupos-av-sqlite';
import { RepositorioHistoricoAvSqlite } from './infraestrutura/repositorio-historico-av-sqlite';
import { RepositorioPerfisAvSqlite } from './infraestrutura/repositorio-perfis-av-sqlite';
import { RepositorioSecaoCustoSqlite } from './infraestrutura/repositorio-secao-custo-sqlite';
import { RepositorioSecaoPcpSqlite } from './infraestrutura/repositorio-secao-pcp-sqlite';
import { RepositorioSecaoProcessoSqlite } from './infraestrutura/repositorio-secao-processo-sqlite';
import { RepositorioSecaoProdutoSqlite } from './infraestrutura/repositorio-secao-produto-sqlite';
import { RepositorioTemplatesAvSqlite } from './infraestrutura/repositorio-templates-av-sqlite';
import { SeletorDeArquivosElectron } from './infraestrutura/seletor-de-arquivos-electron';

export interface DependenciasModuloAvs {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  consultaDeUsuarios: ConsultaDeUsuarios;
  criadorDePreSd: CriadorDePreSd;
  /** Sino da barra superior (módulo de notificações). */
  notificador?: Notificador;
  /** Dados de exemplo: leva a SD da AV até aberta/fechada (módulo de SDs). */
  avancarSdDeExemplo?: AvancarSdDeVitrine;
}

type LinhasDoRelatorio = Awaited<ReturnType<ObterRelatorioAvs['executar']>>;

export interface ModuloAvs {
  /** Usado só pelo modo apresentação (banco isolado). */
  apresentacao: {
    /** Dá ao usuário todas as competências e os dois papéis de aceite da SD. */
    prepararApresentador(usuarioId: string): Promise<void>;
    /** Gera as 25 AVs de exemplo (exige sessão de administrador). */
    gerarExemplos(): Promise<void>;
    /** Cria a AV de vitrine completa e a leva até o PRO (exige sessão de administrador). */
    gerarVitrine(): ReturnType<GerarAvVitrine['executar']>;
    listar(): Promise<{ id: string; numero: string; etapa: number; descricao: string }[]>;
  };
  rotinas: {
    /** Avisa o responsável da etapa atual quando o prazo do cliente está a 5 dias ou venceu. */
    verificarPrazosDoCliente(): Promise<number>;
  };
  comandos: {
    /** Aceite da SD: a AV vai para "Projeto Criado" apontando para o projeto. */
    concluirComProjeto(entrada: ConcluirComProjetoEntrada): Promise<void>;
  };
  consultas: {
    /** Gerente de Engenharia ou Gestor de Programa (aceite da SD). */
    podeDarAceite(usuarioId: string): Promise<boolean>;
    /** Usuários com papel de aceite da SD (Gerente de Engenharia / Gestor de Programa). */
    listarAprovadores(): Promise<string[]>;
    /** Papéis e competências do usuário no fluxo AV/SD, por extenso (para o chat com IA). */
    descreverPapeis(usuarioId: string): Promise<string[]>;
    listarIdsAtivos(): Promise<string[]>;
    /** Uma linha por AV (etapa, prazo, valores consolidados): o módulo de IA usa isto para analisar as AVs. */
    relatorio(): Promise<LinhasDoRelatorio>;
  };
}

export function montarModuloAvs(deps: DependenciasModuloAvs): ModuloAvs {
  const repositorio = new RepositorioAvsSqlite(deps.db);
  const repositorioPerfis = new RepositorioPerfisAvSqlite(deps.db);
  const repositorioHistorico = new RepositorioHistoricoAvSqlite(deps.db);
  const repositorioSecaoCusto = new RepositorioSecaoCustoSqlite(deps.db);
  const repositorioCatalogoCusto = new RepositorioCatalogoCustoSqlite(deps.db);
  const repositorioSecaoProduto = new RepositorioSecaoProdutoSqlite(deps.db);
  const repositorioSecaoProcesso = new RepositorioSecaoProcessoSqlite(deps.db);
  const repositorioAnexos = new RepositorioAnexosSqlite(deps.db);
  const repositorioTemplates = new RepositorioTemplatesAvSqlite(deps.db);
  const repositorioGrupos = new RepositorioGruposAvSqlite(deps.db);
  const repositorioContatos = new RepositorioContatosAvSqlite(deps.db);
  const repositorioSecaoPcp = new RepositorioSecaoPcpSqlite(deps.db);
  const autorizacao = new AutorizacaoAv(deps.consultaDeUsuarios, repositorioPerfis);
  const abridorDeCaminho = new AbridorDeCaminhoElectron();
  const seletorDeArquivos = new SeletorDeArquivosElectron();
  const armazenamentoDeArquivos = new ArmazenamentoDeArquivosFs();
  const versoes = new ControleDeVersaoSqlite(deps.db);
  const notificador = deps.notificador ?? semNotificacao;
  const transacao = new UnidadeDeTrabalhoSqlite(deps.db);

  const criarAv = new CriarAv(repositorio, deps.relogio, deps.geradorDeId, deps.consultaDeUsuarios, autorizacao, versoes, notificador);
  const atualizarComercial = new AtualizarComercial(repositorio, autorizacao, deps.consultaDeUsuarios, versoes);
  const salvarSecaoCusto = new SalvarSecaoCusto(
    repositorio,
    repositorioSecaoCusto,
    autorizacao,
    deps.relogio,
    deps.geradorDeId,
    versoes,
  );
  const salvarSecaoProduto = new SalvarSecaoProduto(
    repositorio,
    repositorioSecaoProduto,
    autorizacao,
    deps.relogio,
    deps.geradorDeId,
    versoes,
  );
  const salvarSecaoProcesso = new SalvarSecaoProcesso(
    repositorio,
    repositorioSecaoProcesso,
    autorizacao,
    deps.relogio,
    deps.geradorDeId,
    versoes,
  );
  const avancarEtapa = new AvancarEtapa(
    repositorio,
    repositorioHistorico,
    autorizacao,
    deps.relogio,
    deps.geradorDeId,
    deps.consultaDeUsuarios,
    versoes,
    notificador,
  );
  const declinarAv = new DeclinarAv(
    repositorio,
    repositorioHistorico,
    autorizacao,
    deps.relogio,
    deps.geradorDeId,
    deps.consultaDeUsuarios,
    versoes,
    notificador,
  );
  const relatorio = new ObterRelatorioAvs(
    repositorio,
    repositorioHistorico,
    repositorioSecaoProduto,
    repositorioSecaoProcesso,
    repositorioSecaoCusto,
    deps.consultaDeUsuarios,
    deps.relogio,
  );
  const finalizar = new FinalizarECriarPreSd(
    repositorio,
    repositorioHistorico,
    autorizacao,
    deps.criadorDePreSd,
    deps.relogio,
    deps.geradorDeId,
    notificador,
  );
  const concluirComProjeto = new ConcluirAvComProjeto(
    repositorio,
    repositorioHistorico,
    deps.relogio,
    deps.geradorDeId,
    notificador,
  );
  const gerarExemplos = new GerarAvsExemplo(
    repositorio,
    repositorioHistorico,
    autorizacao,
    deps.consultaDeUsuarios,
    deps.relogio,
    deps.geradorDeId,
    criarAv,
    atualizarComercial,
    salvarSecaoProduto,
    salvarSecaoProcesso,
    salvarSecaoCusto,
    avancarEtapa,
    declinarAv,
    finalizar,
    deps.avancarSdDeExemplo,
  );

  const salvarSecaoPcp = new SalvarSecaoPcp(repositorio, repositorioSecaoPcp, autorizacao, deps.relogio, deps.geradorDeId, versoes);
  const salvarContatos = new SalvarContatosAv(repositorio, repositorioContatos, autorizacao, deps.geradorDeId);
  const gerarVitrine = new GerarAvVitrine(
    autorizacao,
    deps.consultaDeUsuarios,
    deps.relogio,
    criarAv,
    atualizarComercial,
    salvarContatos,
    salvarSecaoProduto,
    salvarSecaoProcesso,
    salvarSecaoPcp,
    salvarSecaoCusto,
    avancarEtapa,
    finalizar,
    deps.avancarSdDeExemplo,
  );

  registrarIpcAvs(deps.ipc, {
    listar: new ListarAvs(repositorio, deps.consultaDeUsuarios),
    obter: new ObterAv(repositorio, deps.consultaDeUsuarios, versoes),
    criar: criarAv,
    atualizarComercial: atualizarComercial,
    atualizarEquipe: new AtualizarEquipe(repositorio, autorizacao, deps.consultaDeUsuarios, versoes, notificador),
    listarMembros: new ListarMembros(deps.consultaDeUsuarios),
    obterDashboard: new ObterDashboard(repositorio),
    avancarEtapa: transacional(avancarEtapa, transacao),
    declinar: declinarAv,
    listarHistorico: new ListarHistoricoAv(repositorioHistorico, deps.consultaDeUsuarios),
    obterCatalogoCusto: new ObterCatalogoCusto(repositorioCatalogoCusto),
    obterSecaoCusto: new ObterSecaoCusto(repositorioSecaoCusto, versoes),
    salvarSecaoCusto: salvarSecaoCusto,
    obterSecaoProduto: new ObterSecaoProduto(repositorioSecaoProduto, versoes),
    salvarSecaoProduto: salvarSecaoProduto,
    obterSecaoProcesso: new ObterSecaoProcesso(repositorioSecaoProcesso, versoes),
    salvarSecaoProcesso: salvarSecaoProcesso,
    abrirCaminho: new AbrirCaminho(abridorDeCaminho),
    selecionarCaminho: new SelecionarCaminho(seletorDeArquivos),
    listarAnexos: new ListarAnexos(repositorioAnexos, deps.consultaDeUsuarios),
    selecionarEAnexar: new SelecionarEAnexar(
    repositorio,
    repositorioAnexos,
    autorizacao,
    seletorDeArquivos,
    armazenamentoDeArquivos,
    deps.relogio,
    deps.geradorDeId,
    deps.consultaDeUsuarios,
    ),
    obterConteudoAnexo: new ObterConteudoAnexo(repositorioAnexos, armazenamentoDeArquivos),
    excluirAnexo: new ExcluirAnexo(repositorio, repositorioAnexos, autorizacao, armazenamentoDeArquivos),
    gerarExemplos,
    listarGrupos: new ListarGruposAv(repositorioGrupos, repositorio, autorizacao),
    criarGrupo: transacional(
      new CriarGrupoDeAvs(repositorioGrupos, repositorio, criarAv, autorizacao, deps.relogio, deps.geradorDeId),
      transacao,
    ),
    aplicarAoGrupo: new AplicarAoGrupo(repositorio, autorizacao, repositorioContatos, deps.geradorDeId, versoes, notificador),
    relatorio,
    obterSecaoPcp: new ObterSecaoPcp(repositorioSecaoPcp, versoes),
    salvarSecaoPcp,
    obterContatos: new ObterContatosAv(repositorioContatos, autorizacao),
    salvarContatos,
    finalizarECriarPreSd: transacional(finalizar, transacao),
    listarTemplates: new ListarTemplatesAv(repositorioTemplates, autorizacao),
    salvarTemplate: new SalvarTemplateAv(repositorioTemplates, autorizacao, deps.relogio, deps.geradorDeId),
    excluirTemplate: new ExcluirTemplateAv(repositorioTemplates, autorizacao),
    listarPerfis: new ListarPerfisAv(repositorioPerfis, autorizacao, deps.consultaDeUsuarios),
    salvarPerfil: new SalvarPerfilAv(repositorioPerfis, autorizacao, deps.consultaDeUsuarios, notificador),
    obterMeuPerfil: new ObterMeuPerfilAv(autorizacao),
  });

  const verificarPrazosDoCliente = new VerificarPrazosDoCliente(repositorio, notificador, deps.relogio);

  return {
    apresentacao: {
      async prepararApresentador(usuarioId) {
        await repositorioPerfis.salvarPerfil({
          usuarioId,
          papelAv: 'padrao',
          competencias: ['comercial', 'produto', 'processo', 'pcp', 'custo'],
          papeisEspeciais: ['gerente_engenharia', 'gestor_programa'],
        });
      },
      async gerarExemplos() {
        await gerarExemplos.executar();
      },
      gerarVitrine: () => gerarVitrine.executar(),
      async listar() {
        return (await repositorio.listar()).map((av) => ({
          id: av.id,
          numero: av.numero,
          etapa: av.etapaAtual,
          descricao: av.descricao,
        }));
      },
    },
    rotinas: { verificarPrazosDoCliente: () => verificarPrazosDoCliente.executar() },
    comandos: { concluirComProjeto: (entrada) => concluirComProjeto.executar(entrada) },
    consultas: {
      podeDarAceite: async (usuarioId) => podeDarAceiteDaSd(await autorizacao.obterPerfilAv(usuarioId)),
      descreverPapeis: async (usuarioId) => {
        const perfil = await autorizacao.obterPerfilAv(usuarioId);
        return [
          ...perfil.papeisEspeciais.map((papel) => (papel === 'gerente_engenharia' ? 'Gerente de Engenharia' : 'Gestor de Programa')),
          ...perfil.competencias.map((area) => `competência ${ROTULO_DA_AREA[area]}`),
        ];
      },
      listarAprovadores: async () =>
        (await repositorioPerfis.listarPerfis()).filter(podeDarAceiteDaSd).map((perfil) => perfil.usuarioId),
      async listarIdsAtivos() {
        return (await repositorio.listar()).map((av) => av.id);
      },
      relatorio: () => relatorio.executar(),
    },
  };
}
