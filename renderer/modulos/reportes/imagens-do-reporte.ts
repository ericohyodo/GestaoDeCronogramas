import { LIMITES_REPORTE } from '@contratos/reportes.contrato';

// =====================================================================================================
// Prints do reporte na tela: leitura de arquivos/colagem (Ctrl+V) e conferência antes de enviar.
// O processo principal confere tudo de novo (assinatura binária e tamanho).
// =====================================================================================================

/** Tipos aceitos no seletor e na colagem. */
export const TIPOS_DE_PRINT = ['image/png', 'image/jpeg', 'image/bmp'] as const;

export interface PrintSelecionado {
  chave: string;
  nomeArquivo: string;
  tipoMime: string;
  /** Conteúdo sem o prefixo `data:`. */
  base64: string;
  tamanhoBytes: number;
}

/**
 * Lê um arquivo de imagem e devolve o print pronto para enviar.
 * @param arquivo arquivo escolhido ou colado
 * @param chave identificador local (lista da tela)
 * @returns o print, ou a mensagem de recusa
 */
export function lerPrint(arquivo: File, chave: string): Promise<PrintSelecionado | string> {
  if (!(TIPOS_DE_PRINT as readonly string[]).includes(arquivo.type)) {
    return Promise.resolve(`"${arquivo.name}" não é PNG, JPG ou BMP.`);
  }
  if (arquivo.size > LIMITES_REPORTE.bytesPorImagem) {
    return Promise.resolve(`"${arquivo.name}" tem mais de ${LIMITES_REPORTE.bytesPorImagem / 1024 / 1024} MB.`);
  }
  return new Promise((resolver) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const url = String(leitor.result);
      resolver({
        chave,
        // Print colado chega como "image.png": dá um nome mais útil.
        nomeArquivo: arquivo.name && arquivo.name !== 'image.png' ? arquivo.name : `print-${chave}.png`,
        tipoMime: arquivo.type,
        base64: url.slice(url.indexOf(',') + 1),
        tamanhoBytes: arquivo.size,
      });
    };
    leitor.onerror = () => resolver(`Não foi possível ler "${arquivo.name}".`);
    leitor.readAsDataURL(arquivo);
  });
}

/**
 * Imagens coladas da área de transferência (ex.: Win+Shift+S e depois Ctrl+V).
 * @param dados `clipboardData` do evento de colar
 * @returns os arquivos de imagem colados (vazio se o que foi colado é texto)
 */
export function imagensColadas(dados: DataTransfer): File[] {
  return Array.from(dados.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((arquivo): arquivo is File => arquivo !== null);
}
