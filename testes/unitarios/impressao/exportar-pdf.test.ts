import { describe, expect, it } from 'vitest';
import { ExportarPdf, nomeDeArquivo } from '../../../electron/modulos/impressao/aplicacao/exportar-pdf';
import type { DestinoDoArquivo, GeradorDePdf } from '../../../electron/modulos/impressao/aplicacao/portas';
import { ErroNaoEncontrado } from '../../../electron/nucleo/aplicacao/erros';

class GeradorFalso implements GeradorDePdf {
  readonly pedidos: string[] = [];
  async gerar(cronogramaId: string) {
    this.pedidos.push(cronogramaId);
    return new Uint8Array([37, 80, 68, 70]);
  }
}

class DestinoFalso implements DestinoDoArquivo {
  sugerido: string | null = null;
  gravado: { caminho: string; bytes: number } | null = null;
  constructor(private readonly escolha: string | null) {}
  async escolher(nomeSugerido: string) {
    this.sugerido = nomeSugerido;
    return this.escolha;
  }
  async gravarEAbrir(caminho: string, conteudo: Uint8Array) {
    this.gravado = { caminho, bytes: conteudo.length };
  }
}

const consulta = { obterNome: async (id: string) => (id === 'c1' ? 'S Riko: Mufla/M8HB?' : null) };

describe('Exportar PDF', () => {
  it('sugere um nome de arquivo válido, gera e grava no caminho escolhido', async () => {
    const gerador = new GeradorFalso();
    const destino = new DestinoFalso('C:/pdfs/riko.pdf');

    const resultado = await new ExportarPdf(consulta, gerador, destino).executar('c1');

    expect(destino.sugerido).toBe('S Riko- Mufla-M8HB-.pdf');
    expect(gerador.pedidos).toEqual(['c1']);
    expect(destino.gravado).toEqual({ caminho: 'C:/pdfs/riko.pdf', bytes: 4 });
    expect(resultado).toEqual({ caminho: 'C:/pdfs/riko.pdf' });
  });

  it('não gera nada quando a escolha do arquivo é cancelada', async () => {
    const gerador = new GeradorFalso();
    const destino = new DestinoFalso(null);

    expect(await new ExportarPdf(consulta, gerador, destino).executar('c1')).toBeNull();
    expect(gerador.pedidos).toEqual([]);
    expect(destino.gravado).toBeNull();
  });

  it('recusa cronograma inexistente', async () => {
    await expect(
      new ExportarPdf(consulta, new GeradorFalso(), new DestinoFalso('x.pdf')).executar('nao-existe'),
    ).rejects.toThrow(ErroNaoEncontrado);
  });

  it('nome de arquivo nunca fica vazio nem termina em ponto', () => {
    expect(nomeDeArquivo('???')).toBe('---');
    expect(nomeDeArquivo('   ')).toBe('Cronograma');
    expect(nomeDeArquivo('Projeto v2.')).toBe('Projeto v2');
  });
});
