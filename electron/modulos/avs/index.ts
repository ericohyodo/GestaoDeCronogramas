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
import { DeclinarAv } from './aplicacao/casos-de-uso/declinar-av';
import { ExcluirAnexo } from './aplicacao/casos-de-uso/excluir-anexo';
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
import { SalvarSecaoCusto } from './aplicacao/casos-de-uso/salvar-secao-custo';
import { SalvarSecaoProcesso } from './aplicacao/casos-de-uso/salvar-secao-processo';
import { SalvarSecaoProduto } from './aplicacao/casos-de-uso/salvar-secao-produto';
import { SelecionarEAnexar } from './aplicacao/casos-de-uso/selecionar-e-anexar';
import { AutorizacaoAv } from './aplicacao/autorizacao';
import type { ConsultaDeUsuarios } from './aplicacao/portas';
import { registrarIpcAvs } from './apresentacao/controlador-ipc-avs';
import { AbridorDeCaminhoElectron } from './infraestrutura/abridor-de-caminho-electron';
import { ArmazenamentoDeArquivosFs } from './infraestrutura/armazenamento-de-arquivos-fs';
import { RepositorioAnexosSqlite } from './infraestrutura/repositorio-anexos-sqlite';
import { RepositorioAvsSqlite } from './infraestrutura/repositorio-avs-sqlite';
import { RepositorioCatalogoCustoSqlite } from './infraestrutura/repositorio-catalogo-custo-sqlite';
import { RepositorioHistoricoAvSqlite } from './infraestrutura/repositorio-historico-av-sqlite';
import { RepositorioPerfisAvSqlite } from './infraestrutura/repositorio-perfis-av-sqlite';
import { RepositorioSecaoCustoSqlite } from './infraestrutura/repositorio-secao-custo-sqlite';
import { RepositorioSecaoProcessoSqlite } from './infraestrutura/repositorio-secao-processo-sqlite';
import { RepositorioSecaoProdutoSqlite } from './infraestrutura/repositorio-secao-produto-sqlite';
import { SeletorDeArquivosElectron } from './infraestrutura/seletor-de-arquivos-electron';

export interface DependenciasModuloAvs {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  consultaDeUsuarios: ConsultaDeUsuarios;
}

export interface ModuloAvs {
  consultas: {
    listarIdsAtivos(): Promise<string[]>;
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
  const autorizacao = new AutorizacaoAv(deps.consultaDeUsuarios, repositorioPerfis);
  const abridorDeCaminho = new AbridorDeCaminhoElectron();
  const seletorDeArquivos = new SeletorDeArquivosElectron();
  const armazenamentoDeArquivos = new ArmazenamentoDeArquivosFs();

  registrarIpcAvs(deps.ipc, {
    listar: new ListarAvs(repositorio, deps.consultaDeUsuarios),
    obter: new ObterAv(repositorio, deps.consultaDeUsuarios),
    criar: new CriarAv(repositorio, deps.relogio, deps.geradorDeId, deps.consultaDeUsuarios, autorizacao),
    atualizarComercial: new AtualizarComercial(repositorio, autorizacao, deps.consultaDeUsuarios),
    atualizarEquipe: new AtualizarEquipe(repositorio, autorizacao, deps.consultaDeUsuarios),
    listarMembros: new ListarMembros(deps.consultaDeUsuarios),
    obterDashboard: new ObterDashboard(repositorio),
    avancarEtapa: new AvancarEtapa(
      repositorio,
      repositorioHistorico,
      autorizacao,
      deps.relogio,
      deps.geradorDeId,
      deps.consultaDeUsuarios,
    ),
    declinar: new DeclinarAv(
      repositorio,
      repositorioHistorico,
      autorizacao,
      deps.relogio,
      deps.geradorDeId,
      deps.consultaDeUsuarios,
    ),
    listarHistorico: new ListarHistoricoAv(repositorioHistorico, deps.consultaDeUsuarios),
    obterCatalogoCusto: new ObterCatalogoCusto(repositorioCatalogoCusto),
    obterSecaoCusto: new ObterSecaoCusto(repositorioSecaoCusto),
    salvarSecaoCusto: new SalvarSecaoCusto(
      repositorio,
      repositorioSecaoCusto,
      autorizacao,
      deps.relogio,
      deps.geradorDeId,
    ),
    obterSecaoProduto: new ObterSecaoProduto(repositorioSecaoProduto),
    salvarSecaoProduto: new SalvarSecaoProduto(
      repositorio,
      repositorioSecaoProduto,
      autorizacao,
      deps.relogio,
      deps.geradorDeId,
    ),
    obterSecaoProcesso: new ObterSecaoProcesso(repositorioSecaoProcesso),
    salvarSecaoProcesso: new SalvarSecaoProcesso(
      repositorio,
      repositorioSecaoProcesso,
      autorizacao,
      deps.relogio,
      deps.geradorDeId,
    ),
    abrirCaminho: new AbrirCaminho(abridorDeCaminho),
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
  });

  return {
    consultas: {
      async listarIdsAtivos() {
        return (await repositorio.listar()).map((av) => av.id);
      },
    },
  };
}
