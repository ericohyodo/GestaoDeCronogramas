import type { ExportacaoPdfDTO } from '@contratos/impressao.contrato';
import type { CasoDeUso } from '../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../nucleo/aplicacao/erros';
import type { ConsultaDeCronogramas, DestinoDoArquivo, GeradorDePdf } from './portas';

/** Pergunta onde salvar antes de gerar: quem cancela não espera o PDF ficar pronto. */
export class ExportarPdf implements CasoDeUso<string, ExportacaoPdfDTO | null> {
  constructor(
    private readonly consultaDeCronogramas: ConsultaDeCronogramas,
    private readonly gerador: GeradorDePdf,
    private readonly destino: DestinoDoArquivo,
  ) {}

  async executar(cronogramaId: string): Promise<ExportacaoPdfDTO | null> {
    const nome = await this.consultaDeCronogramas.obterNome(cronogramaId);
    if (nome === null) throw new ErroNaoEncontrado('Cronograma');

    const caminho = await this.destino.escolher(`${nomeDeArquivo(nome)}.pdf`);
    if (caminho === null) return null;

    const pdf = await this.gerador.gerar(`/impressao/?id=${encodeURIComponent(cronogramaId)}`, nome);
    await this.destino.gravarEAbrir(caminho, pdf);
    return { caminho };
  }
}

/** Tira os caracteres que o Windows não aceita em nomes de arquivo. */
export function nomeDeArquivo(nome: string): string {
  const limpo = nome
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[. ]+$/, '')
    .trim();
  return limpo || 'Cronograma';
}
