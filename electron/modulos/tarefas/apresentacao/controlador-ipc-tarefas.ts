import { z } from 'zod';
import { CANAIS } from '@contratos/canais';
import { SITUACOES_TAREFA } from '@contratos/tarefas.contrato';
import { esquemaData, esquemaId } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { AtualizarTarefa } from '../aplicacao/casos-de-uso/atualizar-tarefa';
import type { CriarTarefa } from '../aplicacao/casos-de-uso/criar-tarefa';
import type { DeslocarSucessoras } from '../aplicacao/casos-de-uso/deslocar-sucessoras';
import type { ExcluirTarefa } from '../aplicacao/casos-de-uso/excluir-tarefa';
import type {
  AtualizarFase,
  CriarFase,
  ExcluirFase,
} from '../aplicacao/casos-de-uso/gerenciar-fases';
import type { ObterEstrutura } from '../aplicacao/casos-de-uso/obter-estrutura';

export interface CasosDeUsoTarefas {
  obterEstrutura: ObterEstrutura;
  criar: CriarTarefa;
  atualizar: AtualizarTarefa;
  excluir: ExcluirTarefa;
  deslocarSucessoras: DeslocarSucessoras;
  criarFase: CriarFase;
  atualizarFase: AtualizarFase;
  excluirFase: ExcluirFase;
}

const esquemaCriar = z.object({
  cronogramaId: esquemaId,
  titulo: z.string(),
  descricao: z.string().nullish(),
  dataInicio: esquemaData,
  dataFim: esquemaData,
  faseId: esquemaId.nullish(),
  responsavelId: esquemaId.nullish(),
});

const esquemaAtualizar = z.object({
  id: esquemaId,
  titulo: z.string().optional(),
  descricao: z.string().nullable().optional(),
  dataInicio: esquemaData.optional(),
  dataFim: esquemaData.optional(),
  percentualConcluido: z.number().optional(),
  situacao: z.enum(SITUACOES_TAREFA).optional(),
  responsavelId: esquemaId.nullable().optional(),
  dependencias: z.array(esquemaId).optional(),
});

const esquemaDeslocar = z.object({ tarefaId: esquemaId, dias: z.number() });

const esquemaCriarFase = z.object({
  cronogramaId: esquemaId,
  nome: z.string(),
  quantidadeDeSubtarefas: z.number(),
});

const esquemaAtualizarFase = z.object({ id: esquemaId, nome: z.string() });

export function registrarIpcTarefas(ipc: RegistradorIpc, casos: CasosDeUsoTarefas): void {
  ipc.registrar(CANAIS.tarefas.obterEstrutura, 'leitura', esquemaId, (cronogramaId) =>
    casos.obterEstrutura.executar(cronogramaId),
  );
  ipc.registrar(CANAIS.tarefas.criar, 'tarefas', esquemaCriar, (entrada) =>
    casos.criar.executar(entrada),
  );
  ipc.registrar(CANAIS.tarefas.atualizar, 'tarefas', esquemaAtualizar, (entrada) =>
    casos.atualizar.executar(entrada),
  );
  ipc.registrar(CANAIS.tarefas.excluir, 'tarefas', esquemaId, (id) => casos.excluir.executar(id));
  ipc.registrar(CANAIS.tarefas.deslocarSucessoras, 'tarefas', esquemaDeslocar, (entrada) =>
    casos.deslocarSucessoras.executar(entrada),
  );

  // Estruturar o cronograma em fases é trabalho de planejamento.
  ipc.registrar(CANAIS.tarefas.criarFase, 'planejamento', esquemaCriarFase, (entrada) =>
    casos.criarFase.executar(entrada),
  );
  ipc.registrar(CANAIS.tarefas.atualizarFase, 'planejamento', esquemaAtualizarFase, (entrada) =>
    casos.atualizarFase.executar(entrada),
  );
  ipc.registrar(CANAIS.tarefas.excluirFase, 'planejamento', esquemaId, (id) =>
    casos.excluirFase.executar(id),
  );
}
