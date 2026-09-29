/**
 * API pública do módulo AVs (Análises de Viabilidade).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
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
}

type LinhasDoRelatorio = Awaited<ReturnType<ObterRelatorioAvs['executar']>>;

export interface ModuloAvs {
  consultas: {
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

  const criarAv = new CriarAv(repositorio, deps.relogio, deps.geradorDeId, deps.consultaDeUsuarios, autorizacao);
  const atualizarComercial = new AtualizarComercial(repositorio, autorizacao, deps.consultaDeUsuarios);
  const salvarSecaoCusto = new SalvarSecaoCusto(
    repositorio,
    repositorioSecaoCusto,
    autorizacao,
    deps.relogio,
    deps.geradorDeId,
  );
  const salvarSecaoProduto = new SalvarSecaoProduto(
    repositorio,
    repositorioSecaoProduto,
    autorizacao,
    deps.relogio,
    deps.geradorDeId,
  );
  const salvarSecaoProcesso = new SalvarSecaoProcesso(
    repositorio,
    repositorioSecaoProcesso,
    autorizacao,
    deps.relogio,
    deps.geradorDeId,
  );
  const avancarEtapa = new AvancarEtapa(
    repositorio,
    repositorioHistorico,
    autorizacao,
    deps.relogio,
    deps.geradorDeId,
    deps.consultaDeUsuarios,
  );
  const declinarAv = new DeclinarAv(
    repositorio,
    repositorioHistorico,
    autorizacao,
    deps.relogio,
    deps.geradorDeId,
    deps.consultaDeUsuarios,
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
  );

  registrarIpcAvs(deps.ipc, {
    listar: new ListarAvs(repositorio, deps.consultaDeUsuarios),
    obter: new ObterAv(repositorio, deps.consultaDeUsuarios),
    criar: criarAv,
    atualizarComercial: atualizarComercial,
    atualizarEquipe: new AtualizarEquipe(repositorio, autorizacao, deps.consultaDeUsuarios),
    listarMembros: new ListarMembros(deps.consultaDeUsuarios),
    obterDashboard: new ObterDashboard(repositorio),
    avancarEtapa: avancarEtapa,
    declinar: declinarAv,
    listarHistorico: new ListarHistoricoAv(repositorioHistorico, deps.consultaDeUsuarios),
    obterCatalogoCusto: new ObterCatalogoCusto(repositorioCatalogoCusto),
    obterSecaoCusto: new ObterSecaoCusto(repositorioSecaoCusto),
    salvarSecaoCusto: salvarSecaoCusto,
    obterSecaoProduto: new ObterSecaoProduto(repositorioSecaoProduto),
    salvarSecaoProduto: salvarSecaoProduto,
    obterSecaoProcesso: new ObterSecaoProcesso(repositorioSecaoProcesso),
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
    criarGrupo: new CriarGrupoDeAvs(
      repositorioGrupos,
      repositorio,
      criarAv,
      autorizacao,
      deps.relogio,
      deps.geradorDeId,
    ),
    aplicarAoGrupo: new AplicarAoGrupo(repositorio, autorizacao, repositorioContatos, deps.geradorDeId),
    relatorio,
    obterSecaoPcp: new ObterSecaoPcp(repositorioSecaoPcp),
    salvarSecaoPcp: new SalvarSecaoPcp(repositorio, repositorioSecaoPcp, autorizacao, deps.relogio, deps.geradorDeId),
    obterContatos: new ObterContatosAv(repositorioContatos, autorizacao),
    salvarContatos: new SalvarContatosAv(repositorio, repositorioContatos, autorizacao, deps.geradorDeId),
    finalizarECriarPreSd: new FinalizarECriarPreSd(
      repositorio,
      repositorioHistorico,
      autorizacao,
      deps.criadorDePreSd,
      deps.relogio,
      deps.geradorDeId,
    ),
    listarTemplates: new ListarTemplatesAv(repositorioTemplates, autorizacao),
    salvarTemplate: new SalvarTemplateAv(repositorioTemplates, autorizacao, deps.relogio, deps.geradorDeId),
    excluirTemplate: new ExcluirTemplateAv(repositorioTemplates, autorizacao),
  });

  return {
    consultas: {
      async listarIdsAtivos() {
        return (await repositorio.listar()).map((av) => av.id);
      },
      relatorio: () => relatorio.executar(),
    },
  };
}
