/**
 * API pública do módulo AVs (Análises de Viabilidade).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { AtualizarComercial } from './aplicacao/casos-de-uso/atualizar-comercial';
import { AtualizarEquipe } from './aplicacao/casos-de-uso/atualizar-equipe';
import { AvancarEtapa } from './aplicacao/casos-de-uso/avancar-etapa';
import { CriarAv } from './aplicacao/casos-de-uso/criar-av';
import { DeclinarAv } from './aplicacao/casos-de-uso/declinar-av';
import { ListarAvs } from './aplicacao/casos-de-uso/listar-avs';
import { ListarHistoricoAv } from './aplicacao/casos-de-uso/listar-historico';
import { ListarMembros } from './aplicacao/casos-de-uso/listar-membros';
import { ObterAv } from './aplicacao/casos-de-uso/obter-av';
import { ObterDashboard } from './aplicacao/casos-de-uso/obter-dashboard';
import { AutorizacaoAv } from './aplicacao/autorizacao';
import type { ConsultaDeUsuarios } from './aplicacao/portas';
import { registrarIpcAvs } from './apresentacao/controlador-ipc-avs';
import { RepositorioAvsSqlite } from './infraestrutura/repositorio-avs-sqlite';
import { RepositorioHistoricoAvSqlite } from './infraestrutura/repositorio-historico-av-sqlite';
import { RepositorioPerfisAvSqlite } from './infraestrutura/repositorio-perfis-av-sqlite';

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
  const autorizacao = new AutorizacaoAv(deps.consultaDeUsuarios, repositorioPerfis);

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
  });

  return {
    consultas: {
      async listarIdsAtivos() {
        return (await repositorio.listar()).map((av) => av.id);
      },
    },
  };
}
