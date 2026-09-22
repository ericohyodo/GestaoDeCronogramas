import type { AtualizarFaseEntrada, CriarFaseEntrada } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import { Periodo, somarDiasNaData } from '../../../../nucleo/dominio/periodo';
import { Fase } from '../../dominio/fase';
import type { RepositorioFases } from '../../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../../dominio/repositorio-tarefas';
import { Tarefa } from '../../dominio/tarefa';
import type { ConsultaDeCronogramas } from '../portas/consulta-de-cronogramas';

const MAXIMO_DE_SUBTAREFAS = 50;
const DURACAO_PADRAO_EM_DIAS = 7;

/**
 * Cria a fase já com N subtarefas em branco, para preencher nome e responsável direto na lista.
 * Todas começam no início do cronograma, com uma semana de duração, e são ajustadas depois.
 */
export class CriarFase implements CasoDeUso<CriarFaseEntrada, null> {
  constructor(
    private readonly repositorioFases: RepositorioFases,
    private readonly repositorioTarefas: RepositorioTarefas,
    private readonly consultaDeCronogramas: ConsultaDeCronogramas,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: CriarFaseEntrada): Promise<null> {
    const quantidade = entrada.quantidadeDeSubtarefas;
    if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > MAXIMO_DE_SUBTAREFAS) {
      throw new ErroDeValidacao(`Informe de 0 a ${MAXIMO_DE_SUBTAREFAS} subtarefas.`);
    }

    const periodo = await this.consultaDeCronogramas.obterPeriodo(entrada.cronogramaId);
    if (!periodo) throw new ErroNaoEncontrado('Cronograma');

    const agora = this.relogio.agora();
    const fase = Fase.criar({
      id: this.geradorDeId.gerar(),
      cronogramaId: entrada.cronogramaId,
      nome: entrada.nome,
      ordem: await this.repositorioFases.proximaOrdemDeTopo(entrada.cronogramaId),
      agora,
    });
    await this.repositorioFases.salvar(fase);

    const fimPadrao = somarDiasNaData(periodo.inicio, DURACAO_PADRAO_EM_DIAS - 1);
    const periodoPadrao = Periodo.criar(
      periodo.inicio,
      fimPadrao < periodo.fim ? fimPadrao : periodo.fim,
    );

    const subtarefas = Array.from({ length: quantidade }, (_, indice) =>
      Tarefa.criar({
        id: this.geradorDeId.gerar(),
        cronogramaId: entrada.cronogramaId,
        faseId: fase.id,
        titulo: `Tarefa ${indice + 1}`,
        periodo: periodoPadrao,
        ordem: indice + 1,
        agora,
      }),
    );
    await this.repositorioTarefas.salvarVarias(subtarefas);

    return null;
  }
}

export class AtualizarFase implements CasoDeUso<AtualizarFaseEntrada, null> {
  constructor(
    private readonly repositorio: RepositorioFases,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: AtualizarFaseEntrada): Promise<null> {
    const fase = await this.repositorio.obterPorId(entrada.id);
    if (!fase) throw new ErroNaoEncontrado('Fase');
    fase.renomear(entrada.nome, this.relogio.agora());
    await this.repositorio.salvar(fase);
    return null;
  }
}

/** As subtarefas vão junto (ON DELETE CASCADE). */
export class ExcluirFase implements CasoDeUso<string, null> {
  constructor(private readonly repositorio: RepositorioFases) {}

  async executar(id: string): Promise<null> {
    if (!(await this.repositorio.obterPorId(id))) throw new ErroNaoEncontrado('Fase');
    await this.repositorio.excluir(id);
    return null;
  }
}
