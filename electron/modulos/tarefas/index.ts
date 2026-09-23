/**
 * API pública do módulo Tarefas (estrutura analítica: fases, tarefas, dependências e caminho crítico).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { AtualizarTarefa } from './aplicacao/casos-de-uso/atualizar-tarefa';
import { CopiarEstrutura } from './aplicacao/casos-de-uso/copiar-estrutura';
import { CriarTarefa } from './aplicacao/casos-de-uso/criar-tarefa';
import { DeslocarSucessoras } from './aplicacao/casos-de-uso/deslocar-sucessoras';
import { DuplicarTarefa } from './aplicacao/casos-de-uso/duplicar-tarefa';
import { ExcluirTarefa } from './aplicacao/casos-de-uso/excluir-tarefa';
import { AtualizarFase, CriarFase, ExcluirFase } from './aplicacao/casos-de-uso/gerenciar-fases';
import { ListarAgenda } from './aplicacao/casos-de-uso/listar-agenda';
import { ObterEstrutura } from './aplicacao/casos-de-uso/obter-estrutura';
import { ReordenarTarefas } from './aplicacao/casos-de-uso/reordenar-tarefas';
import type { ConsultaDeCronogramas } from './aplicacao/portas/consulta-de-cronogramas';
import type { ConsultaDeResponsaveis } from './aplicacao/portas/consulta-de-responsaveis';
import { registrarIpcTarefas } from './apresentacao/controlador-ipc-tarefas';
import { RepositorioFasesSqlite } from './infraestrutura/repositorio-fases-sqlite';
import { RepositorioTarefasSqlite } from './infraestrutura/repositorio-tarefas-sqlite';

export type { ConsultaDeCronogramas, ConsultaDeResponsaveis };

export interface DependenciasModuloTarefas {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  consultaDeCronogramas: ConsultaDeCronogramas;
  consultaDeResponsaveis: ConsultaDeResponsaveis;
}

export function montarModuloTarefas(deps: DependenciasModuloTarefas): void {
  const repositorio = new RepositorioTarefasSqlite(deps.db);
  const repositorioFases = new RepositorioFasesSqlite(deps.db);

  registrarIpcTarefas(deps.ipc, {
    obterEstrutura: new ObterEstrutura(
      repositorio,
      repositorioFases,
      deps.consultaDeCronogramas,
      deps.consultaDeResponsaveis,
    ),
    criar: new CriarTarefa(
      repositorio,
      repositorioFases,
      deps.consultaDeCronogramas,
      deps.consultaDeResponsaveis,
      deps.relogio,
      deps.geradorDeId,
    ),
    atualizar: new AtualizarTarefa(repositorio, deps.consultaDeResponsaveis, deps.relogio),
    excluir: new ExcluirTarefa(repositorio),
    deslocarSucessoras: new DeslocarSucessoras(repositorio, deps.relogio),
    criarFase: new CriarFase(
      repositorioFases,
      repositorio,
      deps.consultaDeCronogramas,
      deps.relogio,
      deps.geradorDeId,
    ),
    atualizarFase: new AtualizarFase(repositorioFases, deps.relogio),
    excluirFase: new ExcluirFase(repositorioFases),
    reordenar: new ReordenarTarefas(repositorio),
    duplicar: new DuplicarTarefa(repositorio, repositorioFases, deps.relogio, deps.geradorDeId),
    copiarEstrutura: new CopiarEstrutura(
      repositorio,
      repositorioFases,
      deps.consultaDeCronogramas,
      deps.relogio,
      deps.geradorDeId,
    ),
    listarAgenda: new ListarAgenda(
      repositorio,
      repositorioFases,
      deps.consultaDeCronogramas,
      deps.consultaDeResponsaveis,
    ),
  });
}
