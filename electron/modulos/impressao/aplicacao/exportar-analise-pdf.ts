import type { ExportacaoPdfDTO } from '@contratos/impressao.contrato';
import type { CasoDeUso } from '../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaImpressao } from './erro-na-impressao';
import { nomeDeArquivo } from './exportar-pdf';
import type { ConsultaDeAnalises, DestinoDoArquivo, GeradorDePdf } from './portas';

/** PDF de uma análise do arquivo. Como no cronograma, pergunta onde salvar antes de gerar. */
export class ExportarAnalisePdf implements CasoDeUso<string, ExportacaoPdfDTO | null> {
  constructor(
    private readonly consultaDeAnalises: ConsultaDeAnalises,
    private readonly gerador: GeradorDePdf,
    private readonly destino: DestinoDoArquivo,
  ) {}

  async executar(analiseId: string): Promise<ExportacaoPdfDTO | null> {
    const analise = await this.consultaDeAnalises.obterResumo(analiseId);
    if (analise === null) {
      throw new ErroNaImpressao('Esta análise não está mais no arquivo (pode ter sido excluída).');
    }

    // Data local, a mesma que a tela mostra.
    const data = new Date(analise.geradaEm).toLocaleDateString('sv-SE');
    const caminho = await this.destino.escolher(
      `${nomeDeArquivo(`Análise IA - ${analise.titulo} - ${data}`)}.pdf`,
    );
    if (caminho === null) return null;

    const pdf = await this.gerador.gerar(
      `/impressao-analise/?id=${encodeURIComponent(analiseId)}`,
      `Análise com IA · ${analise.titulo}`,
    );
    await this.destino.gravarEAbrir(caminho, pdf);
    return { caminho };
  }
}
