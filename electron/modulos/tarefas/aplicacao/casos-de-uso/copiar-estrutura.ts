import type { CopiarEstruturaEntrada } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import { Periodo } from '../../../../nucleo/dominio/periodo';
import { Fase } from '../../dominio/fase';
import type { RepositorioFases } from '../../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';
import { Tarefa } from '../../dominio/tarefa';
import type { ConsultaDeCronogramas } from '../portas/consulta-de-cronogramas';

/**
 * Usa um cronograma como modelo: copia fases e tarefas (nomes, ordem e dependências) para um
 * cronograma vazio. Datas, responsáveis e progresso ficam para preencher: toda tarefa nasce no
 * início do novo cronograma, com um dia de duração.
 */
export class CopiarEstrutura implements CasoDeUso<CopiarEstruturaEntrada, null> {
  constructor(
    private readonly repositorioTarefas: RepositorioTarefas,
    private readonly repositorioFases: RepositorioFases,
    private readonly consultaDeCronogramas: ConsultaDeCronogramas,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar({ origemId, destinoId }: CopiarEstruturaEntrada): Promise<null> {
    if (origemId === destinoId) {
      throw new ErroDeValidacao('Escolha um cronograma de destino diferente do modelo.');
    }
    if (!(await this.consultaDeCronogramas.existe(origemId))) {
      throw new ErroNaoEncontrado('Cronograma modelo');
    }
    const periodoDestino = await this.consultaDeCronogramas.obterPeriodo(destinoId);
    if (!periodoDestino) throw new ErroNaoEncontrado('Cronograma');

    const [fasesDestino, tarefasDestino] = await Promise.all([
      this.repositorioFases.listarPorCronograma(destinoId),
      this.repositorioTarefas.listarPorCronograma(destinoId),
    ]);
    if (fasesDestino.length > 0 || tarefasDestino.length > 0) {
      throw new ErroDeValidacao('O cronograma de destino precisa estar vazio.');
    }

    const [fases, tarefas] = await Promise.all([
      this.repositorioFases.listarPorCronograma(origemId),
      this.repositorioTarefas.listarPorCronograma(origemId),
    ]);

    const agora = this.relogio.agora();
    const novoIdDaFase = new Map<string, string>();
    const novasFases = fases.map((fase) => {
      const nova = Fase.criar({
        id: this.geradorDeId.gerar(),
        cronogramaId: destinoId,
        nome: fase.nome,
        ordem: fase.ordem,
        agora,
      });
      novoIdDaFase.set(fase.id, nova.id);
      return nova;
    });

    const periodoInicial = Periodo.criar(periodoDestino.inicio, periodoDestino.inicio);
    const novoIdDaTarefa = new Map<string, string>();
    const novasTarefas = tarefas.map((tarefa) => {
      const nova = Tarefa.criar({
        id: this.geradorDeId.gerar(),
        cronogramaId: destinoId,
        faseId: tarefa.faseId ? (novoIdDaFase.get(tarefa.faseId) ?? null) : null,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        periodo: periodoInicial,
        ordem: tarefa.ordem,
        agora,
      });
      novoIdDaTarefa.set(tarefa.id, nova.id);
      return nova;
    });

    for (const fase of novasFases) await this.repositorioFases.salvar(fase);
    await this.repositorioTarefas.salvarVarias(novasTarefas);

    // Segunda passada: a FK das dependências exige que as predecessoras já estejam gravadas.
    const comDependencias = tarefas.flatMap((tarefa, indice) => {
      if (tarefa.dependencias.length === 0) return [];
      const nova = novasTarefas[indice]!;
      nova.definirDependencias(
        tarefa.dependencias.flatMap((id) => novoIdDaTarefa.get(id) ?? []),
        agora,
      );
      return [nova];
    });
    await this.repositorioTarefas.salvarVarias(comDependencias);

    return null;
  }
}
