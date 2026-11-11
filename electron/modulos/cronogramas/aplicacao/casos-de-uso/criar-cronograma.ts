import type { CriarCronogramaEntrada, CronogramaDTO } from '@contratos/cronogramas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { Periodo } from '../../../../nucleo/dominio/periodo';
import { Cronograma } from '../../dominio/cronograma';
import type { RepositorioCronogramas } from '../../dominio/repositorio-cronogramas';
import { paraCronogramaDTO } from '../mapeador-dto';

export class CriarCronograma implements CasoDeUso<CriarCronogramaEntrada, CronogramaDTO> {
  constructor(
    private readonly repositorio: RepositorioCronogramas,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: CriarCronogramaEntrada): Promise<CronogramaDTO> {
    const cronograma = Cronograma.criar({
      id: this.geradorDeId.gerar(),
      nome: entrada.nome,
      descricao: entrada.descricao,
      periodo: Periodo.criar(entrada.dataInicio, entrada.dataFim),
      agora: this.relogio.agora(),
    });
    await this.repositorio.salvar(cronograma);
    return paraCronogramaDTO(cronograma);
  }
}

/** Entrada interna (não exposta por IPC): só o fluxo da SD cria projetos com código. */
export interface CriarProjetoDaSdEntrada {
  nome: string;
  descricao: string | null;
  codigo: string;
  sdId: string;
  dataInicio: string;
  dataFim: string;
}

/** Projeto nascido do aceite da SD: leva o código `PRO AA-SSS` e o vínculo com a SD. */
export class CriarProjetoDaSd implements CasoDeUso<CriarProjetoDaSdEntrada, { id: string }> {
  constructor(
    private readonly repositorio: RepositorioCronogramas,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: CriarProjetoDaSdEntrada): Promise<{ id: string }> {
    const cronograma = Cronograma.criar({
      id: this.geradorDeId.gerar(),
      nome: entrada.nome.slice(0, 120),
      descricao: entrada.descricao,
      periodo: Periodo.criar(entrada.dataInicio, entrada.dataFim),
      codigo: entrada.codigo,
      sdId: entrada.sdId,
      agora: this.relogio.agora(),
    });
    await this.repositorio.salvar(cronograma);
    return { id: cronograma.id };
  }
}
