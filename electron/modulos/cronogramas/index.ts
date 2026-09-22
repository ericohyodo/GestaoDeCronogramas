/**
 * API pública do módulo Cronogramas. Outros módulos e a raiz de composição
 * só podem importar deste arquivo, nunca das camadas internas.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { AtualizarCronograma } from './aplicacao/casos-de-uso/atualizar-cronograma';
import { CriarCronograma } from './aplicacao/casos-de-uso/criar-cronograma';
import { ExcluirCronograma } from './aplicacao/casos-de-uso/excluir-cronograma';
import { ListarCronogramas } from './aplicacao/casos-de-uso/listar-cronogramas';
import { ObterCronograma } from './aplicacao/casos-de-uso/obter-cronograma';
import { registrarIpcCronogramas } from './apresentacao/controlador-ipc-cronogramas';
import { RepositorioCronogramasSqlite } from './infraestrutura/repositorio-cronogramas-sqlite';

export interface DependenciasModuloCronogramas {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
}

export interface ModuloCronogramas {
  /** Consultas que o módulo oferece aos demais módulos. */
  consultas: {
    existe(id: string): Promise<boolean>;
    obterPeriodo(id: string): Promise<{ inicio: string; fim: string } | null>;
  };
}

export function montarModuloCronogramas(deps: DependenciasModuloCronogramas): ModuloCronogramas {
  const repositorio = new RepositorioCronogramasSqlite(deps.db);

  registrarIpcCronogramas(deps.ipc, {
    listar: new ListarCronogramas(repositorio),
    obter: new ObterCronograma(repositorio),
    criar: new CriarCronograma(repositorio, deps.relogio, deps.geradorDeId),
    atualizar: new AtualizarCronograma(repositorio, deps.relogio),
    excluir: new ExcluirCronograma(repositorio),
  });

  return {
    consultas: {
      existe: (id) => repositorio.existe(id),
      async obterPeriodo(id) {
        const cronograma = await repositorio.obterPorId(id);
        return cronograma ? { inicio: cronograma.periodo.inicio, fim: cronograma.periodo.fim } : null;
      },
    },
  };
}
