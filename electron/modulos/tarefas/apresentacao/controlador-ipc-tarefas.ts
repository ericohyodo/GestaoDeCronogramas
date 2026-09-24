import { z } from 'zod';
import { CANAIS } from '@contratos/canais';
import { SITUACOES_TAREFA } from '@contratos/tarefas.contrato';
import {
  esquemaData,
  esquemaId,
  esquemaSemEntrada,
} from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { AjustarDatasDaFase } from '../aplicacao/casos-de-uso/ajustar-datas-da-fase';
import type { AtualizarTarefa } from '../aplicacao/casos-de-uso/atualizar-tarefa';
import type { CopiarEstrutura } from '../aplicacao/casos-de-uso/copiar-estrutura';
import type { CriarTarefa } from '../aplicacao/casos-de-uso/criar-tarefa';
import type { DeslocarSucessoras } from '../aplicacao/casos-de-uso/deslocar-sucessoras';
import type { DuplicarTarefa } from '../aplicacao/casos-de-uso/duplicar-tarefa';
import type { ExcluirTarefa } from '../aplicacao/casos-de-uso/excluir-tarefa';
import type {
  AtualizarFase,
  CriarFase,
  ExcluirFase,
} from '../aplicacao/casos-de-uso/gerenciar-fases';
import type { ListarAgenda } from '../aplicacao/casos-de-uso/listar-agenda';
import type { ObterEstrutura } from '../aplicacao/casos-de-uso/obter-estrutura';
import type { ReordenarTarefas } from '../aplicacao/casos-de-uso/reordenar-tarefas';

export interface CasosDeUsoTarefas {
  obterEstrutura: ObterEstrutura;
  criar: CriarTarefa;
  atualizar: AtualizarTarefa;
  excluir: ExcluirTarefa;
  deslocarSucessoras: DeslocarSucessoras;
  ajustarDatasDaFase: AjustarDatasDaFase;
  criarFase: CriarFase;
  atualizarFase: AtualizarFase;
  excluirFase: ExcluirFase;
  reordenar: ReordenarTarefas;
  duplicar: DuplicarTarefa;
  copiarEstrutura: CopiarEstrutura;
  listarAgenda: ListarAgenda;
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
  evidencia: z.string().nullable().optional(),
  dataEfetiva: esquemaData.nullable().optional(),
  dependencias: z.array(esquemaId).optional(),
});

const esquemaDeslocar = z.object({ tarefaId: esquemaId, dias: z.number() });

const esquemaAjustarDatasDaFase = z.object({ faseId: esquemaId, dataInicio: esquemaData, dataFim: esquemaData });

const esquemaCriarFase = z.object({
  cronogramaId: esquemaId,
  nome: z.string(),
  quantidadeDeSubtarefas: z.number(),
});

const esquemaAtualizarFase = z.object({ id: esquemaId, nome: z.string() });

const esquemaReordenar = z.object({
  cronogramaId: esquemaId,
  ordens: z.array(z.object({ id: esquemaId, ordem: z.number().int().min(1) })),
});

const esquemaCopiarEstrutura = z.object({ origemId: esquemaId, destinoId: esquemaId });

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

  // Estruturar o cronograma em fases (e reenquadrar as datas de uma fase inteira) é planejamento.
  ipc.registrar(CANAIS.tarefas.ajustarDatasDaFase, 'planejamento', esquemaAjustarDatasDaFase, (entrada) =>
    casos.ajustarDatasDaFase.executar(entrada),
  );
  ipc.registrar(CANAIS.tarefas.criarFase, 'planejamento', esquemaCriarFase, (entrada) =>
    casos.criarFase.executar(entrada),
  );
  // Renomear fase: liberado para quem pode editar tarefas (gestor e usuário).
  ipc.registrar(CANAIS.tarefas.atualizarFase, 'tarefas', esquemaAtualizarFase, (entrada) =>
    casos.atualizarFase.executar(entrada),
  );
  ipc.registrar(CANAIS.tarefas.excluirFase, 'planejamento', esquemaId, (id) =>
    casos.excluirFase.executar(id),
  );
  ipc.registrar(CANAIS.tarefas.reordenar, 'tarefas', esquemaReordenar, (entrada) =>
    casos.reordenar.executar(entrada),
  );
  ipc.registrar(CANAIS.tarefas.duplicar, 'tarefas', esquemaId, (id) => casos.duplicar.executar(id));
  // Usar um cronograma como modelo cria estrutura nova: trabalho de planejamento.
  ipc.registrar(CANAIS.tarefas.copiarEstrutura, 'planejamento', esquemaCopiarEstrutura, (entrada) =>
    casos.copiarEstrutura.executar(entrada),
  );
  ipc.registrar(CANAIS.tarefas.listarAgenda, 'leitura', esquemaSemEntrada, () =>
    casos.listarAgenda.executar(),
  );
}
