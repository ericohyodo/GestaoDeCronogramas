import type { CriarTarefaEntrada, TarefaDTO } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import { Periodo } from '../../../../nucleo/dominio/periodo';
import type { RepositorioFases } from '../../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';
import { Tarefa } from '../../dominio/tarefa';
import { abrirEspacoNaOrdem } from '../abrir-espaco-na-ordem';
import { paraTarefaDTO } from '../mapeador-dto';
import type { ConsultaDeCronogramas } from '../portas/consulta-de-cronogramas';
import type { ConsultaDeResponsaveis } from '../portas/consulta-de-responsaveis';

export class CriarTarefa implements CasoDeUso<CriarTarefaEntrada, TarefaDTO> {
  constructor(
    private readonly repositorio: RepositorioTarefas,
    private readonly repositorioFases: RepositorioFases,
    private readonly consultaDeCronogramas: ConsultaDeCronogramas,
    private readonly consultaDeResponsaveis: ConsultaDeResponsaveis,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: CriarTarefaEntrada): Promise<TarefaDTO> {
    if (!(await this.consultaDeCronogramas.existe(entrada.cronogramaId))) {
      throw new ErroNaoEncontrado('Cronograma');
    }

    // Inserção no meio (estilo Word): logo abaixo de uma tarefa, herdando a fase dela.
    const referencia = entrada.inserirApos ? await this.repositorio.obterPorId(entrada.inserirApos) : null;
    if (entrada.inserirApos && (!referencia || referencia.cronogramaId !== entrada.cronogramaId)) {
      throw new ErroNaoEncontrado('Tarefa de referência');
    }
    const faseId = referencia ? referencia.faseId : (entrada.faseId ?? null);
    if (faseId) {
      const fase = await this.repositorioFases.obterPorId(faseId);
      if (!fase) throw new ErroNaoEncontrado('Fase');
      if (fase.cronogramaId !== entrada.cronogramaId) {
        throw new ErroDeValidacao('A fase pertence a outro cronograma.');
      }
    }

    const responsavelId = entrada.responsavelId ?? null;
    if (responsavelId && !(await this.consultaDeResponsaveis.existe(responsavelId))) {
      throw new ErroNaoEncontrado('Responsável');
    }

    const ordem = await this.ordemDaNova(entrada, faseId, referencia?.ordem ?? null);
    const tarefa = Tarefa.criar({
      id: this.geradorDeId.gerar(),
      cronogramaId: entrada.cronogramaId,
      faseId,
      titulo: entrada.titulo,
      descricao: entrada.descricao,
      periodo: Periodo.criar(entrada.dataInicio, entrada.dataFim),
      responsavelId,
      ordem,
      agora: this.relogio.agora(),
    });
    await this.repositorio.salvar(tarefa);
    return paraTarefaDTO(tarefa);
  }

  /**
   * Posição da nova tarefa: abaixo da referência, no início da fase ou (padrão) no fim dela.
   * Nos dois primeiros casos abre espaço descendo as linhas seguintes (rodar dentro de transação).
   */
  private async ordemDaNova(entrada: CriarTarefaEntrada, faseId: string | null, ordemDaReferencia: number | null) {
    let posicao: number | null = null;
    if (ordemDaReferencia !== null) {
      posicao = ordemDaReferencia + 1;
    } else if (entrada.inserirNoInicio && faseId) {
      const daFase = (await this.repositorio.listarPorCronograma(entrada.cronogramaId)).filter(
        (tarefa) => tarefa.faseId === faseId,
      );
      if (daFase.length > 0) posicao = Math.min(...daFase.map((tarefa) => tarefa.ordem));
    }
    if (posicao === null) return this.repositorio.proximaOrdem(entrada.cronogramaId, faseId);
    await abrirEspacoNaOrdem(this.repositorio, this.repositorioFases, entrada.cronogramaId, faseId, posicao);
    return posicao;
  }
}
