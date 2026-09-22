import type { AtualizarTarefaEntrada, AtualizarTarefaSaida } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import { diasEntreDatas } from '../../../../nucleo/dominio/periodo';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';
import {
  sucessorasTransitivas,
  validarSemCiclo,
} from '../../dominio/servicos/calculo-do-cronograma';
import { paraTarefaDTO } from '../mapeador-dto';
import type { ConsultaDeResponsaveis } from '../portas/consulta-de-responsaveis';

export class AtualizarTarefa implements CasoDeUso<AtualizarTarefaEntrada, AtualizarTarefaSaida> {
  constructor(
    private readonly repositorio: RepositorioTarefas,
    private readonly consultaDeResponsaveis: ConsultaDeResponsaveis,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: AtualizarTarefaEntrada): Promise<AtualizarTarefaSaida> {
    const tarefa = await this.repositorio.obterPorId(entrada.id);
    if (!tarefa) throw new ErroNaoEncontrado('Tarefa');

    const irmas = await this.repositorio.listarPorCronograma(tarefa.cronogramaId);
    const fimAnterior = tarefa.periodo.fim;
    const agora = this.relogio.agora();

    if (entrada.titulo !== undefined) tarefa.renomear(entrada.titulo, agora);
    if (entrada.descricao !== undefined) tarefa.alterarDescricao(entrada.descricao, agora);
    if (entrada.dataInicio !== undefined || entrada.dataFim !== undefined) {
      tarefa.alterarPeriodo(
        tarefa.periodo.com({ inicio: entrada.dataInicio, fim: entrada.dataFim }),
        agora,
      );
    }
    if (entrada.percentualConcluido !== undefined) {
      tarefa.registrarProgresso(entrada.percentualConcluido, agora);
    }
    if (entrada.situacao !== undefined) tarefa.alterarSituacao(entrada.situacao, agora);

    if (entrada.responsavelId !== undefined) {
      if (entrada.responsavelId && !(await this.consultaDeResponsaveis.existe(entrada.responsavelId))) {
        throw new ErroNaoEncontrado('Responsável');
      }
      tarefa.definirResponsavel(entrada.responsavelId, agora);
    }

    if (entrada.dependencias !== undefined) {
      const idsDoCronograma = new Set(irmas.map((irma) => irma.id));
      for (const dependencia of entrada.dependencias) {
        if (!idsDoCronograma.has(dependencia)) {
          throw new ErroDeValidacao('A predecessora precisa ser uma tarefa do mesmo cronograma.');
        }
      }
      validarSemCiclo(tarefa.id, entrada.dependencias, irmas);
      tarefa.definirDependencias(entrada.dependencias, agora);
    }

    await this.repositorio.salvar(tarefa);

    return { tarefa: paraTarefaDTO(tarefa), impacto: this.calcularImpacto(tarefa, irmas, fimAnterior) };
  }

  /**
   * Atrasou o término? Lista as sucessoras que poderiam ser empurradas pelos mesmos dias.
   * Quem decide é quem está usando: nem todo atraso precisa mover o resto do cronograma.
   */
  private calcularImpacto(
    tarefa: { id: string; periodo: { fim: string } },
    irmas: Awaited<ReturnType<RepositorioTarefas['listarPorCronograma']>>,
    fimAnterior: string,
  ): AtualizarTarefaSaida['impacto'] {
    const diasDeAtraso = diasEntreDatas(fimAnterior, tarefa.periodo.fim);
    if (diasDeAtraso <= 0) return null;

    const idsSucessoras = sucessorasTransitivas(tarefa.id, irmas);
    if (idsSucessoras.size === 0) return null;

    const sucessoras = irmas
      .filter((irma) => idsSucessoras.has(irma.id))
      .sort((a, b) => a.periodo.inicio.localeCompare(b.periodo.inicio))
      .map((irma) => ({ id: irma.id, titulo: irma.titulo }));

    return { diasDeAtraso, sucessoras };
  }
}
