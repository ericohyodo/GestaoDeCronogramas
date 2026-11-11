/**
 * API pública do módulo Tarefas (estrutura analítica: fases, tarefas, dependências e caminho crítico).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import { type Notificador, semNotificacao } from '../../nucleo/aplicacao/portas/notificador';
import { AvisosDeTarefas, diaLocal } from './aplicacao/avisos-de-tarefas';
import { semearProjetoDeExemplo } from './aplicacao/projeto-de-exemplo';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { AjustarDatasDaFase } from './aplicacao/casos-de-uso/ajustar-datas-da-fase';
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
import { transacional } from '../../nucleo/aplicacao/caso-de-uso';
import { UnidadeDeTrabalhoSqlite } from '../../nucleo/infraestrutura/banco/unidade-de-trabalho-sqlite';

export type { ConsultaDeCronogramas, ConsultaDeResponsaveis };

export interface DependenciasModuloTarefas {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  consultaDeCronogramas: ConsultaDeCronogramas;
  consultaDeResponsaveis: ConsultaDeResponsaveis;
  notificador?: Notificador;
  /** Quem está agindo (não recebe a própria notificação). */
  usuarioAtualId?: () => string | null;
}

export interface ModuloTarefas {
  /** Consultas que o módulo oferece aos demais módulos. */
  consultas: {
    obterEstrutura(cronogramaId: string): ReturnType<ObterEstrutura['executar']>;
  };
  apresentacao: {
    /** Preenche um projeto com fases e tarefas fictícias (modo apresentação). */
    semearProjeto(cronogramaId: string, responsavelIds: string[], inicioIso: string): Promise<void>;
  };
  rotinas: {
    /** Avisa tarefas vencendo (até 2 dias) ou atrasadas de projetos ativos; devolve quantos avisos saíram. */
    verificarPrazos(): Promise<number>;
  };
}

export function montarModuloTarefas(deps: DependenciasModuloTarefas): ModuloTarefas {
  const repositorio = new RepositorioTarefasSqlite(deps.db);
  const repositorioFases = new RepositorioFasesSqlite(deps.db);
  const avisos = new AvisosDeTarefas(
    deps.notificador ?? semNotificacao,
    deps.consultaDeResponsaveis,
    deps.consultaDeCronogramas,
    deps.usuarioAtualId,
  );
  const obterEstrutura = new ObterEstrutura(
    repositorio,
    repositorioFases,
    deps.consultaDeCronogramas,
    deps.consultaDeResponsaveis,
  );

  const transacao = new UnidadeDeTrabalhoSqlite(deps.db);
  registrarIpcTarefas(deps.ipc, {
    obterEstrutura,
    criar: transacional(
      new CriarTarefa(
      repositorio,
      repositorioFases,
      deps.consultaDeCronogramas,
      deps.consultaDeResponsaveis,
      deps.relogio,
      deps.geradorDeId,
      avisos,
      ),
      transacao,
    ),
    atualizar: new AtualizarTarefa(repositorio, deps.consultaDeResponsaveis, deps.relogio, avisos),
    excluir: new ExcluirTarefa(repositorio),
    deslocarSucessoras: new DeslocarSucessoras(repositorio, deps.relogio, avisos),
    ajustarDatasDaFase: new AjustarDatasDaFase(repositorio, repositorioFases, deps.relogio),
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
    duplicar: transacional(new DuplicarTarefa(repositorio, repositorioFases, deps.relogio, deps.geradorDeId), transacao),
    copiarEstrutura: transacional(
      new CopiarEstrutura(repositorio, repositorioFases, deps.consultaDeCronogramas, deps.relogio, deps.geradorDeId),
      transacao,
    ),
    listarAgenda: new ListarAgenda(
      repositorio,
      repositorioFases,
      deps.consultaDeCronogramas,
      deps.consultaDeResponsaveis,
    ),
  });

  return {
    consultas: { obterEstrutura: (cronogramaId) => obterEstrutura.executar(cronogramaId) },
    apresentacao: {
      semearProjeto: (cronogramaId, responsavelIds, inicioIso) =>
        semearProjetoDeExemplo(repositorio, repositorioFases, deps.geradorDeId, deps.relogio, {
          cronogramaId,
          responsavelIds,
          inicioIso,
        }),
    },
    rotinas: {
      async verificarPrazos() {
        const ativos = (await deps.consultaDeCronogramas.listar()).filter((cronograma) => !cronograma.arquivado);
        const tarefas = (await Promise.all(ativos.map((c) => repositorio.listarPorCronograma(c.id)))).flat();
        const nomes = new Map(ativos.map((c) => [c.id, c.nome]));
        return avisos.verificarPrazos(tarefas, diaLocal(deps.relogio.agora()), nomes);
      },
    },
  };
}
