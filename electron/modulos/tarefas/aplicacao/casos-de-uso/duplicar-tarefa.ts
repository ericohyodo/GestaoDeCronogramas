import type { TarefaDTO } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import type { RepositorioFases } from '../../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';
import { Tarefa } from '../../dominio/tarefa';
import { paraTarefaDTO } from '../mapeador-dto';

/**
 * Insere uma cópia logo abaixo da original, na mesma fase: mesmo título, datas, responsável e
 * predecessoras. O progresso não vai junto, porque a cópia é trabalho novo.
 */
export class DuplicarTarefa implements CasoDeUso<string, TarefaDTO> {
  constructor(
    private readonly repositorioTarefas: RepositorioTarefas,
    private readonly repositorioFases: RepositorioFases,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(id: string): Promise<TarefaDTO> {
    const original = await this.repositorioTarefas.obterPorId(id);
    if (!original) throw new ErroNaoEncontrado('Tarefa');

    const abaixo = (item: { ordem: number }) => item.ordem > original.ordem;
    const umaPosicaoAbaixo = (item: { id: string; ordem: number }) => ({ id: item.id, ordem: item.ordem + 1 });

    const irmas = (await this.repositorioTarefas.listarPorCronograma(original.cronogramaId)).filter(
      (tarefa) => tarefa.faseId === original.faseId && abaixo(tarefa),
    );
    await this.repositorioTarefas.atualizarOrdens(irmas.map(umaPosicaoAbaixo));

    // Tarefas soltas dividem a numeração de topo com as fases: as fases abaixo descem também.
    if (original.faseId === null) {
      const fases = await this.repositorioFases.listarPorCronograma(original.cronogramaId);
      await this.repositorioFases.atualizarOrdens(fases.filter(abaixo).map(umaPosicaoAbaixo));
    }

    const agora = this.relogio.agora();
    const copia = Tarefa.criar({
      id: this.geradorDeId.gerar(),
      cronogramaId: original.cronogramaId,
      faseId: original.faseId,
      titulo: original.titulo,
      descricao: original.descricao,
      periodo: original.periodo,
      responsavelId: original.responsavelId,
      ordem: original.ordem + 1,
      agora,
    });
    copia.definirDependencias(original.dependencias, agora);
    await this.repositorioTarefas.salvar(copia);

    return paraTarefaDTO(copia);
  }
}
