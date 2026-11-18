import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import type { Area } from './area';

export interface Anexo {
  id: string;
  avId: string;
  secao: Area;
  nomeArquivo: string;
  nomeArmazenado: string;
  tipoMime: string | null;
  tamanhoBytes: number;
  usuarioId: string | null;
  criadoEm: Date;
}

// =====================================================================================================
// Regras de aceite dos anexos da AV (desenhos, layouts e evidências)
// =====================================================================================================

/** Únicas extensões aceitas como anexo da AV (desenhos e imagens). Vale para todos os blocos de anexo. */
export const EXTENSOES_DE_DESENHO = ['pdf', 'jpg', 'jpeg', 'tif', 'tiff', 'png', 'bmp'] as const;

/** Limite por arquivo, igual ao das evidências da SD: evita encher a pasta compartilhada. */
export const TAMANHO_MAXIMO_ANEXO_BYTES = 25 * 1024 * 1024;

/**
 * Extensão do nome do arquivo, sem o ponto e em minúsculas.
 * @param nomeArquivo nome com extensão (ex.: "Desenho.PDF")
 * @returns a extensão (ex.: "pdf") ou "" quando não houver
 */
export function extensaoDe(nomeArquivo: string): string {
  const ponto = nomeArquivo.lastIndexOf('.');
  return ponto <= 0 || ponto === nomeArquivo.length - 1 ? '' : nomeArquivo.slice(ponto + 1).toLowerCase();
}

/**
 * Confere se um arquivo pode ser anexado à AV (extensão permitida e tamanho dentro do limite).
 * @param nomeArquivo nome original do arquivo
 * @param tamanhoBytes tamanho em bytes
 * @throws ErroDeValidacao com a mensagem para a pessoa quando o arquivo é recusado
 */
export function validarArquivoDeAnexo(nomeArquivo: string, tamanhoBytes: number): void {
  const extensao = extensaoDe(nomeArquivo);
  if (!(EXTENSOES_DE_DESENHO as readonly string[]).includes(extensao)) {
    throw new ErroDeValidacao(`"${nomeArquivo}" não pode ser anexado. Aceita apenas PDF, JPG, JPEG, TIFF, PNG e BMP.`);
  }
  if (tamanhoBytes > TAMANHO_MAXIMO_ANEXO_BYTES) {
    throw new ErroDeValidacao(`"${nomeArquivo}" tem mais de ${TAMANHO_MAXIMO_ANEXO_BYTES / 1024 / 1024} MB.`);
  }
}
