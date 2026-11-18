import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioAnexos } from '../../dominio/repositorio-anexos';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import type { ArmazenamentoDeArquivos } from '../portas';

export class ExcluirAnexo implements CasoDeUso<string, null> {
  constructor(
    private readonly repositorioAvs: RepositorioAvs,
    private readonly repositorio: RepositorioAnexos,
    private readonly autorizacao: AutorizacaoAv,
    private readonly armazenamento: ArmazenamentoDeArquivos,
  ) {}

  async executar(anexoId: string): Promise<null> {
    const anexo = await this.repositorio.obterPorId(anexoId);
    if (!anexo) throw new ErroNaoEncontrado('Anexo');

    const av = await this.repositorioAvs.obterPorId(anexo.avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    await this.autorizacao.exigirEdicaoDaArea(av, anexo.secao);

    await this.armazenamento.excluirArquivo(anexo.avId, anexo.nomeArmazenado);
    await this.repositorio.excluir(anexoId);
    return null;
  }
}
