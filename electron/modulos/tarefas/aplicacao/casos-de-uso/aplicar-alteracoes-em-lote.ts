import type {
  AplicarAlteracoesEntrada,
  EstadoEsperadoDaTarefaDTO,
  OperacaoDeCronogramaDTO,
} from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio, ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import type { RepositorioFases } from '../../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';
import type { Tarefa } from '../../dominio/tarefa';
import { diaLocal } from '../avisos-de-tarefas';
import type { AtualizarTarefa } from './atualizar-tarefa';
import type { CriarTarefa } from './criar-tarefa';
import type { ReordenarTarefas } from './reordenar-tarefas';

// =====================================================================================================
// Aplica, numa transação só, as alterações que o agente do Chat com IA propôs e a pessoa confirmou.
// Reaproveita os casos de uso da tela (mesmas validações e avisos). Antes de mexer, confere que cada
// tarefa envolvida está como estava na proposta: se alguém mudou o cronograma nesse meio-tempo, nada é
// aplicado e a pessoa pede uma proposta nova.
// =====================================================================================================

const LIMITE_DE_OPERACOES = 60;

/** Reordenar por último: assim vale para as tarefas recém-criadas e com as datas já ajustadas. */
const PRIORIDADE: Record<OperacaoDeCronogramaDTO['tipo'], number> = {
  concluir_tarefa: 0,
  atualizar_progresso: 0,
  ajustar_datas: 0,
  criar_tarefa: 1,
  ordenar_fase_por_data: 2,
};

function mudou(tarefa: Tarefa, esperado: EstadoEsperadoDaTarefaDTO): boolean {
  return (
    tarefa.faseId !== esperado.faseId ||
    tarefa.periodo.inicio !== esperado.dataInicio ||
    tarefa.periodo.fim !== esperado.dataFim ||
    tarefa.percentualConcluido !== esperado.percentualConcluido ||
    tarefa.situacao !== esperado.situacao
  );
}

/** Ids de tarefas já existentes que a operação usa (precisam estar no estado esperado). */
function tarefasUsadas(operacao: OperacaoDeCronogramaDTO): string[] {
  switch (operacao.tipo) {
    case 'concluir_tarefa':
    case 'atualizar_progresso':
    case 'ajustar_datas':
      return [operacao.tarefaId];
    case 'criar_tarefa':
      return operacao.inserirApos ? [operacao.inserirApos] : [];
    case 'ordenar_fase_por_data':
      return [];
  }
}

export class AplicarAlteracoesEmLote implements CasoDeUso<AplicarAlteracoesEntrada, number> {
  constructor(
    private readonly repositorio: RepositorioTarefas,
    private readonly repositorioFases: RepositorioFases,
    private readonly criar: CriarTarefa,
    private readonly atualizar: AtualizarTarefa,
    private readonly reordenar: ReordenarTarefas,
    private readonly relogio: Relogio,
  ) {}

  /** @returns quantas alterações foram aplicadas */
  async executar(entrada: AplicarAlteracoesEntrada): Promise<number> {
    if (entrada.operacoes.length === 0) throw new ErroDeValidacao('A proposta não tem alterações.');
    if (entrada.operacoes.length > LIMITE_DE_OPERACOES) {
      throw new ErroDeValidacao(`Uma proposta pode ter no máximo ${LIMITE_DE_OPERACOES} alterações.`);
    }
    await this.conferirEstado(entrada);

    const operacoes = [...entrada.operacoes].sort((a, b) => PRIORIDADE[a.tipo] - PRIORIDADE[b.tipo]);
    for (const operacao of operacoes) await this.aplicar(entrada.cronogramaId, operacao);
    return operacoes.length;
  }

  private async conferirEstado(entrada: AplicarAlteracoesEntrada): Promise<void> {
    const esperadoPorId = new Map(entrada.esperado.map((item) => [item.tarefaId, item]));
    for (const id of new Set(entrada.operacoes.flatMap(tarefasUsadas))) {
      const esperado = esperadoPorId.get(id);
      if (!esperado) throw new ErroDeValidacao('A proposta cita uma tarefa sem o estado de referência.');
      const tarefa = await this.repositorio.obterPorId(id);
      if (!tarefa || tarefa.cronogramaId !== entrada.cronogramaId) {
        throw new ErroDeDominio(
          'PROPOSTA_DESATUALIZADA',
          `A tarefa "${esperado.titulo}" não existe mais neste projeto. Peça uma nova proposta.`,
        );
      }
      if (mudou(tarefa, esperado)) {
        throw new ErroDeDominio(
          'PROPOSTA_DESATUALIZADA',
          `A tarefa "${esperado.titulo}" foi alterada depois da proposta. Nada foi aplicado; peça uma nova proposta.`,
        );
      }
    }
  }

  private async aplicar(cronogramaId: string, operacao: OperacaoDeCronogramaDTO): Promise<void> {
    switch (operacao.tipo) {
      case 'concluir_tarefa':
        await this.atualizar.executar({
          id: operacao.tarefaId,
          percentualConcluido: 100,
          situacao: 'concluida',
          dataEfetiva: operacao.dataEfetiva ?? diaLocal(this.relogio.agora()),
          ...(operacao.evidencia ? { evidencia: operacao.evidencia } : {}),
        });
        return;
      case 'atualizar_progresso':
        await this.atualizar.executar({
          id: operacao.tarefaId,
          percentualConcluido: operacao.percentual,
          situacao: operacao.percentual === 100 ? 'concluida' : operacao.percentual > 0 ? 'em_andamento' : 'pendente',
        });
        return;
      case 'ajustar_datas':
        await this.atualizar.executar({ id: operacao.tarefaId, dataInicio: operacao.dataInicio, dataFim: operacao.dataFim });
        return;
      case 'criar_tarefa':
        await this.criar.executar({
          cronogramaId,
          titulo: operacao.titulo,
          dataInicio: operacao.dataInicio,
          dataFim: operacao.dataFim,
          faseId: operacao.faseId,
          responsavelId: operacao.responsavelId,
          inserirApos: operacao.inserirApos,
        });
        return;
      case 'ordenar_fase_por_data': {
        const fase = await this.repositorioFases.obterPorId(operacao.faseId);
        if (!fase || fase.cronogramaId !== cronogramaId) throw new ErroDeValidacao('Fase não encontrada neste projeto.');
        const tarefas = (await this.repositorio.listarPorCronograma(cronogramaId))
          .filter((tarefa) => tarefa.faseId === operacao.faseId)
          .sort(
            (a, b) =>
              a.periodo.inicio.localeCompare(b.periodo.inicio) ||
              a.periodo.fim.localeCompare(b.periodo.fim) ||
              a.ordem - b.ordem,
          );
        await this.reordenar.executar({ cronogramaId, ordens: tarefas.map((tarefa, i) => ({ id: tarefa.id, ordem: i + 1 })) });
        return;
      }
    }
  }
}
