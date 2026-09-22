import type { EstruturaCronogramaDTO, LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import { diasEntreDatas } from '../../../../nucleo/dominio/periodo';
import type { Fase } from '../../dominio/fase';
import type { RepositorioFases } from '../../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';
import { calcularCronograma } from '../../dominio/servicos/calculo-do-cronograma';
import type { Tarefa } from '../../dominio/tarefa';
import type { ConsultaDeCronogramas } from '../portas/consulta-de-cronogramas';
import type { ConsultaDeResponsaveis } from '../portas/consulta-de-responsaveis';

/**
 * Monta a estrutura analítica pronta para a tela: fases e tarefas ordenadas, numeradas em WBS
 * (1, 1.1, 1.2, 2...), com o resumo das fases e o resultado do caminho crítico.
 */
export class ObterEstrutura implements CasoDeUso<string, EstruturaCronogramaDTO> {
  constructor(
    private readonly repositorioTarefas: RepositorioTarefas,
    private readonly repositorioFases: RepositorioFases,
    private readonly consultaDeCronogramas: ConsultaDeCronogramas,
    private readonly consultaDeResponsaveis: ConsultaDeResponsaveis,
  ) {}

  async executar(cronogramaId: string): Promise<EstruturaCronogramaDTO> {
    const periodoDoCronograma = await this.consultaDeCronogramas.obterPeriodo(cronogramaId);
    if (!periodoDoCronograma) throw new ErroNaoEncontrado('Cronograma');

    const [fases, tarefas] = await Promise.all([
      this.repositorioFases.listarPorCronograma(cronogramaId),
      this.repositorioTarefas.listarPorCronograma(cronogramaId),
    ]);

    const calculo = calcularCronograma(tarefas);
    const nomesDeResponsaveis = await this.consultaDeResponsaveis.obterNomes(
      [...new Set(tarefas.map((tarefa) => tarefa.responsavelId).filter((id) => id !== null))],
    );

    const tarefasPorFase = agruparPorFase(tarefas);
    const itensDeTopo = ordenarTopo(fases, tarefasPorFase.get(null) ?? []);

    // Primeira passada: numeração, necessária para exibir as dependências como "1.2".
    const numeroPorTarefa = new Map<string, string>();
    itensDeTopo.forEach((item, indice) => {
      const numero = String(indice + 1);
      if (item.tipo === 'tarefa') {
        numeroPorTarefa.set(item.tarefa.id, numero);
        return;
      }
      (tarefasPorFase.get(item.fase.id) ?? []).forEach((tarefa, subIndice) => {
        numeroPorTarefa.set(tarefa.id, `${numero}.${subIndice + 1}`);
      });
    });

    const linhas: LinhaEstruturaDTO[] = [];
    itensDeTopo.forEach((item, indice) => {
      const numero = String(indice + 1);
      if (item.tipo === 'tarefa') {
        linhas.push(this.paraLinhaDeTarefa(item.tarefa, numero, 0, calculo, nomesDeResponsaveis, numeroPorTarefa));
        return;
      }
      const subtarefas = tarefasPorFase.get(item.fase.id) ?? [];
      linhas.push(paraLinhaDeFase(item.fase, numero, subtarefas));
      subtarefas.forEach((tarefa, subIndice) => {
        linhas.push(
          this.paraLinhaDeTarefa(
            tarefa,
            `${numero}.${subIndice + 1}`,
            1,
            calculo,
            nomesDeResponsaveis,
            numeroPorTarefa,
          ),
        );
      });
    });

    // Janela do Gantt: do início ao fim do projeto, esticada se alguma tarefa passar dessas bordas.
    return {
      cronogramaId,
      inicio: tarefas.reduce(
        (menor, tarefa) => (tarefa.periodo.inicio < menor ? tarefa.periodo.inicio : menor),
        periodoDoCronograma.inicio,
      ),
      fim: tarefas.reduce(
        (maior, tarefa) => (tarefa.periodo.fim > maior ? tarefa.periodo.fim : maior),
        periodoDoCronograma.fim,
      ),
      linhas,
    };
  }

  private paraLinhaDeTarefa(
    tarefa: Tarefa,
    numero: string,
    nivel: number,
    calculo: ReturnType<typeof calcularCronograma>,
    nomesDeResponsaveis: Map<string, string>,
    numeroPorTarefa: Map<string, string>,
  ): LinhaEstruturaDTO {
    const dependencias = tarefa.dependencias;
    return {
      tipo: 'tarefa',
      id: tarefa.id,
      numero,
      nivel,
      faseId: tarefa.faseId,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      dataInicio: tarefa.periodo.inicio,
      dataFim: tarefa.periodo.fim,
      duracaoEmDias: tarefa.periodo.duracaoEmDias,
      percentualConcluido: tarefa.percentualConcluido,
      situacao: tarefa.situacao,
      responsavelId: tarefa.responsavelId,
      responsavelNome: tarefa.responsavelId
        ? (nomesDeResponsaveis.get(tarefa.responsavelId) ?? null)
        : null,
      dependencias,
      dependenciasNumeros: dependencias.map((id) => numeroPorTarefa.get(id) ?? '?'),
      critico: calculo.criticas.has(tarefa.id),
      folgaEmDias: calculo.folgaPorTarefa.get(tarefa.id) ?? null,
      conflitoDeDependencia: calculo.conflitos.has(tarefa.id),
    };
  }
}

function agruparPorFase(tarefas: Tarefa[]): Map<string | null, Tarefa[]> {
  const grupos = new Map<string | null, Tarefa[]>();
  for (const tarefa of tarefas) {
    const grupo = grupos.get(tarefa.faseId) ?? [];
    grupo.push(tarefa);
    grupos.set(tarefa.faseId, grupo);
  }
  for (const grupo of grupos.values()) grupo.sort((a, b) => a.ordem - b.ordem);
  return grupos;
}

type ItemDeTopo = { tipo: 'fase'; ordem: number; fase: Fase } | { tipo: 'tarefa'; ordem: number; tarefa: Tarefa };

/** Fases e tarefas soltas dividem a mesma numeração de topo. */
function ordenarTopo(fases: Fase[], tarefasSoltas: Tarefa[]): ItemDeTopo[] {
  const itens: ItemDeTopo[] = [
    ...fases.map((fase): ItemDeTopo => ({ tipo: 'fase', ordem: fase.ordem, fase })),
    ...tarefasSoltas.map((tarefa): ItemDeTopo => ({ tipo: 'tarefa', ordem: tarefa.ordem, tarefa })),
  ];
  return itens.sort((a, b) => a.ordem - b.ordem);
}

/** Resumo da fase: menor início, maior término e percentual ponderado pela duração. */
function paraLinhaDeFase(fase: Fase, numero: string, subtarefas: Tarefa[]): LinhaEstruturaDTO {
  const inicio = subtarefas.reduce<string | null>(
    (menor, tarefa) => (menor === null || tarefa.periodo.inicio < menor ? tarefa.periodo.inicio : menor),
    null,
  );
  const fim = subtarefas.reduce<string | null>(
    (maior, tarefa) => (maior === null || tarefa.periodo.fim > maior ? tarefa.periodo.fim : maior),
    null,
  );
  const duracaoTotal = subtarefas.reduce((soma, tarefa) => soma + tarefa.periodo.duracaoEmDias, 0);
  const avanco = subtarefas.reduce(
    (soma, tarefa) => soma + tarefa.percentualConcluido * tarefa.periodo.duracaoEmDias,
    0,
  );

  return {
    tipo: 'fase',
    id: fase.id,
    numero,
    nivel: 0,
    faseId: null,
    titulo: fase.nome,
    descricao: null,
    dataInicio: inicio,
    dataFim: fim,
    duracaoEmDias: inicio && fim ? diasEntreDatas(inicio, fim) + 1 : 0,
    percentualConcluido: duracaoTotal > 0 ? Math.round(avanco / duracaoTotal) : 0,
    situacao: null,
    responsavelId: null,
    responsavelNome: null,
    dependencias: [],
    dependenciasNumeros: [],
    critico: false,
    folgaEmDias: null,
    conflitoDeDependencia: false,
  };
}
