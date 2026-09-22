import type {
  AtualizarCronogramaEntrada,
  CronogramaDTO,
} from '@contratos/cronogramas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import type { RepositorioCronogramas } from '../../dominio/repositorio-cronogramas';
import { paraCronogramaDTO } from '../mapeador-dto';

export class AtualizarCronograma implements CasoDeUso<AtualizarCronogramaEntrada, CronogramaDTO> {
  constructor(
    private readonly repositorio: RepositorioCronogramas,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: AtualizarCronogramaEntrada): Promise<CronogramaDTO> {
    const cronograma = await this.repositorio.obterPorId(entrada.id);
    if (!cronograma) throw new ErroNaoEncontrado('Cronograma');

    const agora = this.relogio.agora();
    if (entrada.nome !== undefined) cronograma.renomear(entrada.nome, agora);
    if (entrada.descricao !== undefined) cronograma.alterarDescricao(entrada.descricao, agora);
    if (entrada.dataInicio !== undefined || entrada.dataFim !== undefined) {
      cronograma.alterarPeriodo(
        cronograma.periodo.com({ inicio: entrada.dataInicio, fim: entrada.dataFim }),
        agora,
      );
    }
    if (entrada.situacao !== undefined) cronograma.alterarSituacao(entrada.situacao, agora);

    await this.repositorio.salvar(cronograma);
    return paraCronogramaDTO(cronograma);
  }
}
