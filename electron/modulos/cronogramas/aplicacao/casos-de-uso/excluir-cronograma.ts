import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import type { RepositorioCronogramas } from '../../dominio/repositorio-cronogramas';

export class ExcluirCronograma implements CasoDeUso<string, null> {
  constructor(private readonly repositorio: RepositorioCronogramas) {}

  async executar(id: string): Promise<null> {
    const cronograma = await this.repositorio.obterPorId(id);
    if (!cronograma) throw new ErroNaoEncontrado('Projeto');
    // Projeto nascido do aceite de uma SD faz parte da rastreabilidade AV → SD → PRO: arquiva-se, não se exclui.
    if (cronograma.sdId) {
      throw new ErroDeDominio(
        'PROJETO_DE_SD',
        `${cronograma.codigo ?? 'Este projeto'} nasceu do aceite de uma SD e não pode ser excluído. Use a situação "Arquivado".`,
      );
    }
    await this.repositorio.excluir(id);
    return null;
  }
}
