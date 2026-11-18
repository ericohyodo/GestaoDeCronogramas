import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';

// =====================================================================================================
// Reporte de erro ou sugestão e o seu log de alterações
// =====================================================================================================

export type TipoReporte = 'erro' | 'sugestao';
export type StatusReporte = 'aberto' | 'em_analise' | 'resolvido' | 'descartado';
export type TipoEventoReporte = 'criado' | 'status' | 'comentario';

export const TIPOS_DE_REPORTE: readonly TipoReporte[] = ['erro', 'sugestao'];
export const STATUS_DE_REPORTE: readonly StatusReporte[] = ['aberto', 'em_analise', 'resolvido', 'descartado'];

export const LIMITE_TEXTO_REPORTE = 4000;
export const LIMITE_COMENTARIO_REPORTE = 1000;
export const LIMITE_IMAGENS_REPORTE = 3;
export const LIMITE_BYTES_IMAGEM_REPORTE = 10 * 1024 * 1024;

export interface Reporte {
  id: string;
  numero: number;
  tipo: TipoReporte;
  texto: string;
  status: StatusReporte;
  usuarioId: string | null;
  rota: string | null;
  versaoApp: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ImagemReporte {
  id: string;
  reporteId: string;
  ordem: number;
  nomeArquivo: string;
  nomeArmazenado: string;
  tipoMime: TipoDeImagem;
  tamanhoBytes: number;
}

export interface EventoReporte {
  id: string;
  reporteId: string;
  tipo: TipoEventoReporte;
  statusDe: StatusReporte | null;
  statusPara: StatusReporte | null;
  comentario: string | null;
  usuarioId: string | null;
  criadoEm: Date;
}

/** Reporte na lista, com a quantidade de prints. */
export interface ReporteListado extends Reporte {
  quantidadeImagens: number;
}

/**
 * Valida o relato escrito pela pessoa.
 * @param texto descrição do erro ou da sugestão
 * @returns o texto sem espaços nas pontas
 * @throws ErroDeValidacao se vazio ou longo demais
 */
export function validarTextoDoReporte(texto: string): string {
  return exigirTexto(texto, 'A descrição do reporte', LIMITE_TEXTO_REPORTE);
}

/**
 * Valida o comentário do administrador.
 * @param comentario texto opcional
 * @returns o comentário normalizado, ou `null`
 * @throws ErroDeValidacao se passar do limite
 */
export function validarComentario(comentario: string | null | undefined): string | null {
  const normalizado = normalizarTextoOpcional(comentario);
  if (normalizado && normalizado.length > LIMITE_COMENTARIO_REPORTE) {
    throw new ErroDeValidacao(`O comentário pode ter no máximo ${LIMITE_COMENTARIO_REPORTE} caracteres.`);
  }
  return normalizado;
}

/**
 * Decide o tipo de evento de um andamento: mudança de status ou só comentário.
 * @param atual status atual do reporte
 * @param novo status pedido
 * @param comentario comentário já validado
 * @returns `status` quando muda; `comentario` quando o status se mantém e há comentário
 * @throws ErroDeValidacao quando nada muda (mesmo status e sem comentário)
 */
export function tipoDoAndamento(atual: StatusReporte, novo: StatusReporte, comentario: string | null): TipoEventoReporte {
  if (atual !== novo) return 'status';
  if (comentario) return 'comentario';
  throw new ErroDeValidacao('Escolha outro status ou escreva um comentário.');
}

// --- Prints anexados -------------------------------------------------------------------------------

export type TipoDeImagem = 'image/png' | 'image/jpeg' | 'image/bmp';

const EXTENSAO_DO_TIPO: Record<TipoDeImagem, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/bmp': '.bmp',
};

/**
 * Descobre o tipo da imagem pela assinatura binária (os primeiros bytes), sem confiar no nome do arquivo.
 * @param bytes conteúdo do arquivo
 * @returns o tipo MIME, ou `null` se não for PNG, JPEG nem BMP
 */
export function detectarTipoDeImagem(bytes: Uint8Array): TipoDeImagem | null {
  const comeca = (...assinatura: number[]) => assinatura.every((byte, indice) => bytes[indice] === byte);
  if (comeca(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (comeca(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (comeca(0x42, 0x4d) && bytes.length > 26) return 'image/bmp';
  return null;
}

/**
 * Valida um print anexado (assinatura e tamanho) e devolve o tipo e o nome a gravar.
 * @param nomeArquivo nome original (só para exibição)
 * @param bytes conteúdo decodificado
 * @returns tipo MIME detectado e um nome seguro com a extensão correta
 * @throws ErroDeValidacao se não for imagem aceita ou passar do limite
 */
export function validarImagemDoReporte(
  nomeArquivo: string,
  bytes: Uint8Array,
): { tipoMime: TipoDeImagem; nomeSeguro: string } {
  if (bytes.length === 0) throw new ErroDeValidacao(`"${nomeArquivo}" está vazio.`);
  if (bytes.length > LIMITE_BYTES_IMAGEM_REPORTE) {
    throw new ErroDeValidacao(`"${nomeArquivo}" tem mais de ${LIMITE_BYTES_IMAGEM_REPORTE / 1024 / 1024} MB.`);
  }
  const tipoMime = detectarTipoDeImagem(bytes);
  if (!tipoMime) throw new ErroDeValidacao(`"${nomeArquivo}" não é uma imagem PNG, JPG ou BMP.`);
  const base = nomeArquivo.replace(/\.[^.]*$/, '').replace(/[^\p{L}\p{N} _-]/gu, '_').trim().slice(0, 80) || 'print';
  return { tipoMime, nomeSeguro: `${base}${EXTENSAO_DO_TIPO[tipoMime]}` };
}
