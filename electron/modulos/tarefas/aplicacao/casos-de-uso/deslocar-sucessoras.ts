import type { DeslocarSucessorasEntrada } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';
import { sucessorasTransitivas } from '../../dominio/servicos/calculo-do-cronograma';

const LIMITE_DE_DIAS = 3650;

/** Empurra todas as sucessoras (diretas e indiretas) pelo mesmo número de dias, sob confirmação. */
export class DeslocarSucessoras implements CasoDeUso<DeslocarSucessorasEntrada, null> {
  constructor(
    private readonly repositorio: RepositorioTarefas,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: DeslocarSucessorasEntrada): Promise<null> {
    if (!Number.isInteger(entrada.dias) || entrada.dias === 0) {
      throw new ErroDeValidacao('Informe um número inteiro de dias diferente de zero.');
    }
    if (Math.abs(entrada.dias) > LIMITE_DE_DIAS) {
      throw new ErroDeValidacao('Deslocamento muito grande.');
    }

    const tarefa = await this.repositorio.obterPorId(entrada.tarefaId);
    if (!tarefa) throw new ErroNaoEncontrado('Tarefa');

    const irmas = await this.repositorio.listarPorCronograma(tarefa.cronogramaId);
    const idsSucessoras = sucessorasTransitivas(entrada.tarefaId, irmas);
    const agora = this.relogio.agora();

    const deslocadas = irmas.filter((irma) => idsSucessoras.has(irma.id));
    for (const sucessora of deslocadas) sucessora.deslocar(entrada.dias, agora);
    await this.repositorio.salvarVarias(deslocadas);

    return null;
  }
}
