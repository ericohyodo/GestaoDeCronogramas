import type { ItemAgendaDTO } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioFases } from '../../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';
import type { ConsultaDeCronogramas } from '../portas/consulta-de-cronogramas';
import type { ConsultaDeResponsaveis } from '../portas/consulta-de-responsaveis';

/**
 * Todas as tarefas dos cronogramas não arquivados, ordenadas pelo término. Os relatórios
 * (por responsável, projeto ou período) filtram esta lista na tela.
 */
export class ListarAgenda implements CasoDeUso<void, ItemAgendaDTO[]> {
  constructor(
    private readonly repositorioTarefas: RepositorioTarefas,
    private readonly repositorioFases: RepositorioFases,
    private readonly consultaDeCronogramas: ConsultaDeCronogramas,
    private readonly consultaDeResponsaveis: ConsultaDeResponsaveis,
  ) {}

  async executar(): Promise<ItemAgendaDTO[]> {
    const cronogramas = (await this.consultaDeCronogramas.listar()).filter((c) => !c.arquivado);
    const itens: ItemAgendaDTO[] = [];

    for (const cronograma of cronogramas) {
      const [fases, tarefas] = await Promise.all([
        this.repositorioFases.listarPorCronograma(cronograma.id),
        this.repositorioTarefas.listarPorCronograma(cronograma.id),
      ]);
      const nomeDaFase = new Map(fases.map((fase) => [fase.id, fase.nome]));

      for (const tarefa of tarefas) {
        itens.push({
          tarefaId: tarefa.id,
          titulo: tarefa.titulo,
          cronogramaId: cronograma.id,
          cronogramaNome: cronograma.nome,
          faseNome: tarefa.faseId ? (nomeDaFase.get(tarefa.faseId) ?? null) : null,
          responsavelId: tarefa.responsavelId,
          responsavelNome: null,
          dataInicio: tarefa.periodo.inicio,
          dataFim: tarefa.periodo.fim,
          percentualConcluido: tarefa.percentualConcluido,
        });
      }
    }

    const nomes = await this.consultaDeResponsaveis.obterNomes([
      ...new Set(itens.flatMap((item) => item.responsavelId ?? [])),
    ]);
    for (const item of itens) {
      if (item.responsavelId) item.responsavelNome = nomes.get(item.responsavelId) ?? null;
    }

    return itens.sort(
      (a, b) =>
        a.dataFim.localeCompare(b.dataFim) ||
        a.cronogramaNome.localeCompare(b.cronogramaNome, 'pt-BR') ||
        a.titulo.localeCompare(b.titulo, 'pt-BR'),
    );
  }
}
